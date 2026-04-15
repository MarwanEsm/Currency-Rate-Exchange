import * as React from 'react';

const useMediaQuery = (query) => {
    const getMatches = () => {
        if (typeof window === "undefined") return false;
        return window.matchMedia(query).matches;
    };

    const [matches, setMatches] = React.useState(getMatches);

    React.useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const mediaQueryList = window.matchMedia(query);
        const listener = (event) => setMatches(event.matches);

        setMatches(mediaQueryList.matches);
        mediaQueryList.addEventListener("change", listener);

        return () => mediaQueryList.removeEventListener("change", listener);
    }, [query]);

    return matches;
};

const useIsDesktop = () => useMediaQuery('(min-width: 1252px)');

const useIsMobile = () => useMediaQuery('(max-width: 375px)');


export {
    useIsDesktop,
    useIsMobile,
};
