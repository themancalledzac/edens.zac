import {useRouter} from 'next/router';
import PhotoBlockComponent from "../../Components/PhotoBlockComponent/PhotoBlockComponent";
import React, {useEffect, useState} from "react";
import styles from '../../styles/Catalog.module.scss';
import Header from "../../Components/Header/Header";
import {fetchCatalogBySlug} from "@/lib/api/catalogs";
import {Catalog} from "@/types/Catalog";
import {Image} from "@/types/Image";
import {chunkImageArray} from "@/utils/imageUtils";

interface CatalogPageProps {
    catalog: Catalog;
}

/**
 * Photography Gallery Page.
 * Currently, has a switch case with local json files when backend not available.
 * @param params
 * @returns {Promise<{props: {data: {}}}|{props: {data: {}}}|{props: {data: {}}}|{props: {data: {}}}|{props: {data: *[]}}|{props: {data: {}}}>}
 */
export async function getServerSideProps({params}) {

    try {
        const slug = params?.slug as string;
        const catalog = await fetchCatalogBySlug(slug);

        // return {
        //     props: {}
        // }
        // const photoDataList = await response.json();
        const chunkedList = await chunkImageArray(catalog.images, 2);

        return {
            props: {data: chunkedList},
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
const CatalogPage = ({data}) => {
    const [imageSelected, setImageSelected] = useState(null);
    const router = useRouter();
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

            const flattenedData = data.flat();
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
        console.log({data});

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }


    }, [data, imageSelected]);

    if (!data) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.catalogPageMain}>
            <Header/>
            <div className={styles.photoBlockWrapper}>
                {data.map((photoPair: any, index: React.Key) => (
                    <PhotoBlockComponent
                        isMobile={isMobile}
                        key={index}
                        photos={photoPair}
                        imageSelected={imageSelected}
                        setImageSelected={setImageSelected}
                    />
                ))}
            </div>
        </div>
    );
};

export default CatalogPage;