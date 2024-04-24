import React from "react";
import { Link as RegistrationLink } from "react-router-dom";
import styles from './Link.module.scss'

const Link = ({ onClick }) =>
    <div className={styles.container}>
        <label>You don't have an account <span><b>?</b></span></label>
        <RegistrationLink onClick={onClick}>
            Click here to register
        </RegistrationLink>
        <br />
    </div>



export default Link