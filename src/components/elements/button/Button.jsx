import React from "react";
import styles from "./Button.module.scss"

const Button = ({ children, onClick, disabled, type = "button", ...props }) =>
    <div>
        <button
            className={`${styles.button} ${disabled ? styles.disabled : ""}`}
            onClick={onClick}
            disabled={disabled}
            type={type}
            {...props}
        >
            {children}
        </button>
    </div>


export default Button;
