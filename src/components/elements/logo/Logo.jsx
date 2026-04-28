import React from "react";
import Image from "next/image";
import Currency from "../../../assets/Currency.png";
import styles from "./Logo.module.scss";

const Logo = ({ onClick, variant = "default", ariaLabel }) => {
    const commonImg = {
        src: Currency,
        alt: "Currency-Exchange",
        width: 150,
        height: 150,
        loading: "eager",
    };

    if (variant === "app") {
        return (
            <div
                className={styles.logoAppWrap}
                onClick={onClick}
                onKeyDown={(e) => {
                    if (!onClick) return;
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClick(e);
                    }
                }}
                role={onClick ? "button" : undefined}
                tabIndex={onClick ? 0 : undefined}
                aria-label={onClick ? (ariaLabel ?? "Go to exchange rates") : undefined}
            >
                <Image
                    {...commonImg}
                    className={styles.imageAppInner}
                />
                <span className={styles.logoAppTintRight} aria-hidden="true" />
            </div>
        );
    }

    return (
        <Image {...commonImg} className={styles.image} onClick={onClick} />
    );
};

export default Logo;
