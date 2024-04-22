import React from "react";
import Currency from "../../../assets/Currency.png";
import styles from "./Logo.module.scss"


const Logo = () =>
    <img
        src={Currency}
        alt="Currency-Exchange"
        className={styles.image}
    />



export default Logo;
