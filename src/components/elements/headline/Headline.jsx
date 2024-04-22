import React from "react"
import ColoredDot from "../coloredDot/ColoredDot"


const Headline = ({ size, children, character = '-', ...options }) =>
    React.createElement('h' + size, options,
        <ColoredDot character={character} size={size}>{children}</ColoredDot>)

export default Headline