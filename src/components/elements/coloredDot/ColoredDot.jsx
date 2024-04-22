import styles from "./ColoredDot.module.scss"

const ColoredDot = ({ children, character }) => {

    return <>
        {Array.isArray(children) ? children[0] : children}
        <span
            className={styles.green}
        >
            {character}
        </span>
        {Array.isArray(children) &&
            children.length >= 1 &&
            children.slice(1)}
    </>
}

export default ColoredDot