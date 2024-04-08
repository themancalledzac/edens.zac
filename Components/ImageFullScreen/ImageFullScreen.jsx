import Image from "next/image";
import styles from './ImageFullScreen.module.scss';
import React from "react";

const isValidSource = ( title ) => {
    return title && title !== "";
};

export default function ImageFullScreen( { imageSelected, setImageSelected } ) {
    const handleClick = () => {
        setImageSelected( null );
    }

    return (
        <div className={styles.imageFullScreenWrapper} onClick={handleClick}>
            <Image
                src={isValidSource( imageSelected?.title ) ? `/${imageSelected.title}` : ""}
                alt={'Photo'}
                layout="fill"
                objectFit="contain"
                priority={true}
            />
        </div>
    )
}
