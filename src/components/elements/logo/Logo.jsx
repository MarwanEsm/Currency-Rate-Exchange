import React from "react";
import Image from "next/image";
import Currency from "../../../assets/Currency.png";
import styles from "./Logo.module.scss"


const Logo = ({ onClick }) =>
    <Image
        src={Currency}
        alt="Currency-Exchange"
        width={150}
        height={150}
        loading="eager"
        className={styles.image}
        onClick={onClick}
    />

export default Logo;
