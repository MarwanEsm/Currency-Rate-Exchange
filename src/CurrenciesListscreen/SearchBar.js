import React, {useState} from "react";

function DisplaySearchedCurrency() {
  
    const [searchedCurrency, setSearchedCurrency] = useState("");
    const [searchedResults, setSearchedResults] = useState([]);
    const displaySearchedCurrency = (event) => {
        setSearchedCurrency = (event.target.value);
    }
    useEffect(() => {
    const results = exchangeRates.key.filter(exchangeRate =>
      exchangeRate.includes(searchedCurrency)
    );
    setSearchedResults(results);
  }, [searchedCurrency]);
 <ul>
         {searchedResults.map(key => (
          <li>{key}</li>
        ))}
      </ul>
    
  );
}

export default DisplaySearchedCurrency;
