import styles from '../styles/Home.module.css'
import { Image } from "@mui/icons-material";

export default function CarouselImage( { image } ) {

    const getStyle = () => {
        if ( image.vertical ) {
            return styles.carouselImageVertical;
        } else {
            return styles.carouselImageHorizontal
        }

    }

    return (
        <img
            key={image.src}
            title={image.src}
            src={image.src}
            alt={image.src}
            className={getStyle()}
            loading="lazy"

        />
    )
};


function carouselOrderer( image ) {

}
