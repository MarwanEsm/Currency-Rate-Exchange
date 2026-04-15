import React from "react";
import styles from "./Button.module.scss";
import classNames from "classnames";

const Button = ({ children, onClick, disabled, type = "button", variant = "primary", fullWidth = false, className, ...props }) => (
    <button
        className={classNames(
            styles.button,
            styles[variant],
            {
                [styles.disabled]: disabled,
                [styles.fullWidth]: fullWidth,
            },
            className,
        )}
        onClick={onClick}
        disabled={disabled}
        type={type}
        {...props}
    >
        {children}
    </button>
);


export default Button;
