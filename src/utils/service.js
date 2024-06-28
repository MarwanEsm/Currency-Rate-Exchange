import * as React from 'react';
import { useMediaQuery } from '@material-ui/core';

const useIsDesktop = () => useMediaQuery('(min-width: 1252px)');

const useIsMobile = () => useMediaQuery('(max-width: 375px)');


export {
    useIsDesktop,
    useIsMobile,
};
