import React from "react";
import styles from './Container.module.scss'

const Container = ({ children }) => (
    <div className={styles.parent}>
        <div className={styles.content}>{children}</div>
    </div>
);


export default Container



