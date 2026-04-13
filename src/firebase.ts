import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  getRedirectResult,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/** Call once on app load before relying on auth state (completes redirect sign-in). */
export function awaitRedirectAuthResult(): Promise<void> {
  return getRedirectResult(auth)
    .then(() => undefined)
    .catch(() => undefined);
}

const USE_REDIRECT_AFTER_POPUP_FAIL = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

function unauthorizedDomainHint(): string {
  if (typeof window === 'undefined') return '';
  const { hostname, port } = window.location;
  const p = port ? `:${port}` : '';
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (hostname === '127.0.0.1' || isIpv4) {
    if (hostname === '127.0.0.1') {
      return ` Use http://localhost${p} neste app (ou adicione "127.0.0.1" em Firebase Console → Authentication → Settings → Authorized domains).`;
    }
    return ` Para login neste endereço (${hostname}), adicione-o em Firebase Console → Authentication → Settings → Authorized domains, ou abra o app em http://localhost${p} neste computador.`;
  }
  return ' Confira em Firebase Console → Authentication → Settings se este domínio está em Authorized domains.';
}

export const loginWithGoogle = async () => {
  const provider = googleProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: string }).code)
        : '';
    console.error('Error signing in with Google', error);

    if (code === 'auth/unauthorized-domain') {
      window.alert('Não foi possível entrar.' + unauthorizedDomainHint());
      return;
    }

    if (code === 'auth/operation-not-allowed') {
      window.alert(
        'O login com Google está desativado no Firebase. Ative em: Firebase Console → Authentication → Sign-in method → Google.',
      );
      return;
    }

    if (code === 'auth/configuration-not-found' || code === 'auth/invalid-api-key') {
      window.alert(
        'Configuração do Firebase inválida. Confira firebase-applet-config.json (projectId, apiKey, authDomain) no Console do projeto.',
      );
      return;
    }

    if (code === 'auth/popup-closed-by-user') {
      return;
    }

    if (code && USE_REDIRECT_AFTER_POPUP_FAIL.has(code)) {
      await signInWithRedirect(auth, provider);
      return;
    }
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};
