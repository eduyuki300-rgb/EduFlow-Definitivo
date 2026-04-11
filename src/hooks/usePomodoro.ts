import { useState, useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';

const usePomodoro = () => {
    const [isActive, setIsActive] = useState(false);
    const [time, setTime] = useState(25 * 60); // 25 minutes
    const [cycles, setCycles] = useState(0);

    // Start timer
    useEffect(() => {
        let interval = null;
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime(prevTime => prevTime - 1);
            }, 1000);
        } else if (time === 0) {
            // Save cycle to Firebase
            handleCycleComplete();
        }
        return () => clearInterval(interval);
    }, [isActive, time]);

    // Handle cycle completion
    const handleCycleComplete = async () => {
        setCycles(prevCycles => prevCycles + 1);
        setIsActive(false);
        setTime(25 * 60); // Reset timer
        await saveCycleToFirebase(cycles + 1);
    };

    // Save cycle to Firestore
    const saveCycleToFirebase = async (cycles) => {
        const db = firebase.firestore();
        await db.collection('pomodoroCycles').add({
            cycles,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
    };

    // Start a new session
    const startTimer = () => {
        setIsActive(true);
    };

    // Stop the current session
    const stopTimer = () => {
        setIsActive(false);
    };

    return { time, isActive, startTimer, stopTimer, cycles };
};

export default usePomodoro;