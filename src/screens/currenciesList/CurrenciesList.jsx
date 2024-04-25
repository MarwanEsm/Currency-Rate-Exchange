import React from "react";
import ListOfCurrencies from "../../components/listOfCurrencies/ListOfCurrencies"
import Container from "../../components/layout/container/Container"
// import ThreeDotsMenu from "../Style/ThreeDotsMenu";
import styles from "./CurrenciesList.module.scss"

const CurrenciesList = () =>
    <div>
        <div className={styles.menu}>
            {/* <ThreeDotsMenu /> */}
        </div>
        <Container />
        <div className={styles.list}>
            <ListOfCurrencies />
        </div>
    </div>




export default CurrenciesList;
