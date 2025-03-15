import PhotoBlockComponent from "../../Components/PhotoBlockComponent/PhotoBlockComponent";
import React, {useEffect, useState} from "react";
import styles from '../../styles/Catalog.module.scss';
import Header from "../../Components/Header/Header";
import {fetchCatalogBySlug} from "@/lib/api/catalogs";
import {Catalog} from "@/types/Catalog";
import {Image} from "@/types/Image";
import {chunkImages} from "@/utils/imageUtils";

interface CatalogPageProps {
    catalog: Catalog;
    imageChunks: Image[][];
}

/**
 * Photography Gallery Page.
 */
export async function getServerSideProps({params}) {

    try {
        const slug: string = params?.slug as string;
        const catalogFull: Catalog = await fetchCatalogBySlug(slug);

        const {images, ...catalog} = catalogFull;

        // We can only do the chunking on the server, not the sizing
        // as sizing depends on client viewport dimensions
        const imageChunks: Image[][] = chunkImages(images, 2);

        return {
            props: {
                catalog,
                imageChunks
            },
        };
    } catch (error) {
        console.error("Fetch error: ", error);

        // return {
        //     props: {data: await chunkArray(localData, 2)}
        // };
        return {
            notFound: true
        };
    }
}

// The page component that renders the content for each title
const CatalogPage = ({catalog, imageChunks}: CatalogPageProps) => {
    const [imageSelected, setImageSelected] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);

    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (imageSelected === null) return;

            const flattenedData = imageChunks.flat();
            const currentIndex = flattenedData.findIndex(img => img.id === imageSelected.id);

            if (event.key === "ArrowRight") {
                const nextIndex = (currentIndex + 1) % flattenedData.length;
                setImageSelected(flattenedData[nextIndex]);
            } else if (event.key === "ArrowLeft") {
                const prevIndex = (currentIndex - 1 + flattenedData.length) % flattenedData.length;
                setImageSelected(flattenedData[prevIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        console.log({imageChunks});

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }


    }, [imageChunks, imageSelected]);

    if (!catalog) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.catalogPageMain}>
            <Header/>
            <div className={styles.photoBlockWrapper}>
                {imageChunks && imageChunks.length > 0 && (
                    imageChunks.map((photoPair: Image[], index: React.Key) => (
                        <PhotoBlockComponent
                            isMobile={isMobile}
                            key={index}
                            photos={photoPair}
                            imageSelected={imageSelected}
                            setImageSelected={setImageSelected}
                        />
                    )))}
            </div>
        </div>
    );
};

export default CatalogPage;