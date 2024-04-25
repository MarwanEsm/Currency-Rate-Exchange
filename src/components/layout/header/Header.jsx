import DateAndTime from "../../elements/dateAndTime/DateAndTime"
import Headline from "../../elements/headline/Headline"
import styles from "./Header.module.scss"

const Header = () => <div className={styles.container}>
    <Headline size={2} character=".">Welcome Back</Headline>
    <DateAndTime />
</div>


export default Header