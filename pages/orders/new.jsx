/** `/orders/new` — fiat amount, asset, network, and payout address; creates `submitted` orders (FCX-40). */
import FiatToCryptoRequestForm from "../../src/screens/fiatToCryptoRequest/FiatToCryptoRequestForm";

const NewFiatToCryptoOrderPage = () => {
    return <FiatToCryptoRequestForm />;
};

export default NewFiatToCryptoOrderPage;
