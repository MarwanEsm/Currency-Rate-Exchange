import React from "react";
import styles from './Container.module.scss'

const Container = ({ children }) =>
    <div className={styles.parent}>
        <div className={styles.secondChild}></div>
        <div className={styles.firstChild}></div>
        {children}
    </div>


export default Container



