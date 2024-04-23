import React from "react";
import styles from "./Button.module.scss"

const Button = ({ children, onClick }) =>
    <div>
        <button
            className={styles.button}
            onClick={onClick}
        >
            {children}
        </button>
    </div>





export default Button;
