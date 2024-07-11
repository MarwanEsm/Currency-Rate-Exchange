import React from "react";
import Currency from "../../../assets/Currency.png";
import styles from "./Logo.module.scss"


const Logo = ({ onClick }) =>
    <img
        src={Currency}
        alt="Currency-Exchange"
        className={styles.image}
        onClick={onClick}
    />

export default Logo;
