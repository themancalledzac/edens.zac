import {useRouter} from 'next/router';
import PhotoBlockComponent from "../../Components/PhotoBlockComponent/PhotoBlockComponent";
import React, {useEffect, useState} from "react";
import styles from '../../styles/Catalog.module.scss';
import Header from "../../Components/Header/Header";
import corporate from "../../Images/corporatePage.json";
import enchantments from "../../Images/enchantmentsPage.json";
import arches from "../../Images/archesPage.json";
import hidden_lake from "../../Images/hidden_lakePage.json";
import oval_lakes from "../../Images/oval_LakesPage.json";
import amsterdam from "../../Images/amsterdamPage.json";
import paris from "../../Images/parisPage.json";
import florence from "../../Images/florencePage.json";
import rome from "../../Images/romePage.json";
import vienna from "../../Images/viennaPage.json";
import {fetchCatalogById} from "@/lib/api/catalogs";
import {Catalog} from "@/types/Catalog";
import {Image} from "@/types/Image";

const localDataMap = {
    corporate,
    enchantments,
    arches,
    hidden_lake,
    oval_lakes,
    amsterdam,
    paris,
    florence,
    rome,
    vienna
};

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
    // const url = `http://localhost:8080/api/v1/image/getImagesByCatalogs/${name}`;

    try {
        const id = params?.id as string;
        const catalog = await fetchCatalogById(id);
        console.log(catalog);

        // return {
        //     props: {}
        // }
        // const photoDataList = await response.json();
        const chunkedList = await chunkArray(catalog.images, 2);

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

// TODO: PRIORITY ---------------------------------------------------------------------------------
//  - Update this into a Utils file ( think about a central 'utils' file, would that make sense? or individual for each file? hmm
//  - This would actually be REALLY useful bits of code here in a central repo
//  - Usable by Blog, or even Home Page if we do it correctly ( could have 'vertical' items intermixed
// TODO: PRIORITY ---------------------------------------------------------------------------------

async function chunkArray(photoArray: Image[], chunkSize: number) {
    let result = [];
    let todo = [];

    for (const photo of photoArray) {
        if (photo?.rating === 5 && !(photo?.imageHeight > photo?.imageWidth)) { // TODO: Add an, `&& if vertical`
            // If it's a 5-star image, add it immediately as a single-image pair.
            result.push([photo]);
        } else {
            // Add current image to the waiting list.
            todo.push(photo);
            // If we have enough images for a pair, add them to the result.
            if (todo.length === chunkSize) {
                result.push([...todo]); // Use spread operator to clone the array
                todo = []; // Clear the todo list
            }
        }
    }

    // If there's an image left over that didn't form a pair, add it to the result.
    if (todo.length > 0) {
        result.push(todo);
    }

    return result;
}

// The page component that renders the content for each title
const CatalogPage = ({data}) => {
    // const {homePageType} = useAppContext();
    const [imageSelected, setImageSelected] = useState(null);
    const router = useRouter();

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
                {data.map((photoPair, index) => (
                    <PhotoBlockComponent
                        isMobile={false}
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