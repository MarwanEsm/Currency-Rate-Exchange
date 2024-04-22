import React from "react";
import Currency from "../../../assets/Currency.png";
import styles from "./Logo.module.scss"


const Logo = () =>
    <div className={styles.container}>
        <img
            src={Currency}
            alt="Currency-Exchange"
        />
    </div>


export default Logo;
