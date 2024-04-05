import Image from "next/image";
import styles from './ImageFullScreen.module.scss';
import { useEffect } from "react";

const isValidSource = ( title ) => {
    return title && title !== "";
};

export default function ImageFullScreen( { selectedPhoto, setSelectedPhoto } ) {

    console.log( 'image full screen:' );
    console.log( selectedPhoto );
    const handleClick = () => {
        setSelectedPhoto( null );
    }

    return (
        <div className={styles.imageFullScreenWrapper} onClick={handleClick}>
            <Image
                src={isValidSource( selectedPhoto?.title ) ? `/${selectedPhoto.title}` : ""}
                alt={'Photo'}
                // width={selectedPhoto.imageWidth} height={selectedPhoto.imageHeight}
                layout="fill"
                objectFit="contain"
                priority
                quality={55}
            />
        </div>
    )
}
