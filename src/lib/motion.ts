import type { Transition, Variants } from "motion/react";

export const SPRING_SNAPPY: Transition = {
    type: "spring",
    stiffness: 420,
    damping: 32,
    mass: 0.8,
};

export const SPRING_GENTLE: Transition = {
    type: "spring",
    stiffness: 280,
    damping: 28,
    mass: 1,
};

export const SPRING_SHEET: Transition = {
    type: "spring",
    stiffness: 340,
    damping: 34,
    mass: 0.9,
};

export const EASE_OUT_FAST: Transition = {
    duration: 0.18,
    ease: [0.22, 1, 0.36, 1],
};

export const EASE_OUT_NORMAL: Transition = {
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1],
};

export const fadeInUpVariants: Variants = {
    hidden: { opacity: 1, y: 0 },
    visible: {
        opacity: 1,
        y: 0,
        transition: EASE_OUT_NORMAL,
    },
    exit: {
        opacity: 1,
        y: 0,
        transition: EASE_OUT_FAST,
    },
};

export const staggerContainerVariants: Variants = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
    },
};
