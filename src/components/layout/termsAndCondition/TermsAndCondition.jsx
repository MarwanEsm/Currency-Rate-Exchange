import Button from "../../elements/button/Button";

const TermsAndConditions = ({ closePopup }) => {
    return (
        <div>
            <p>Terms Of Service</p>
            <h3>
                Make sure you're enjoying your life and enjoy using this App either
            </h3>
            <Button type="submit" onClick={closePopup}>
                Accept
            </Button>
        </div>
    );
}


export default TermsAndConditions