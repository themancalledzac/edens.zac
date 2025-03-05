import React from 'react';

import styles from './ParallaxSectionWrapper.module.scss';

interface ParallaxSectionWrapperProps {
    children: React.ReactNode;
}

const ParallaxSectionWrapper: React.FC<ParallaxSectionWrapperProps> = ({children}) => {
    return (
        <div className={styles.parallaxSectionWrapper}>
            {children}
        </div>
    );
};

export default ParallaxSectionWrapper;