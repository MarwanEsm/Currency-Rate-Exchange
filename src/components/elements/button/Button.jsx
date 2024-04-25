import React from "react";
import styles from "./Button.module.scss"

const Button = ({ children, onClick, disabled }) =>
    <div>
        <button
            className={`${styles.button} ${disabled ? styles.disabled : ""}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    </div>


export default Button;
