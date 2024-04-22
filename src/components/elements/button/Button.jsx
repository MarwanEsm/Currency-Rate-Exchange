import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Button.module.scss"

const Button = ({ children }) => {

    const navigate = useNavigate()

    const showLogInPage = (event) => {
        event.preventDefault();
        navigate("/LogInScreen");
    };

    return (
        <div>
            <button
                className={styles.button}
                onClick={showLogInPage}
            >
                {children}
            </button>
        </div>
    );
}



export default Button;
