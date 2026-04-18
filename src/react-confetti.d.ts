declare module 'react-confetti' {
    import React from 'react';
    export interface Props {
        width?: number;
        height?: number;
        numberOfPieces?: number;
        recycle?: boolean;
        run?: boolean;
        gravity?: number;
        wind?: number;
        friction?: number;
        initialVelocityX?: number;
        initialVelocityY?: number;
        colors?: string[];
        opacity?: number;
        tweenDuration?: number;
    }
    const Confetti: React.FC<Props>;
    export default Confetti;
}
