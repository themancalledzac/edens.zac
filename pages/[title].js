import { useRouter } from 'next/router';
import PhotoBlockComponent from "../Components/PhotoBlockComponent/PhotoBlockComponent";
import React, { useEffect, useState } from "react";

export async function getServerSideProps( { params } ) {
    console.log( params );
    const url = `http://localhost:8080/api/v1/image/getImagesByAdventure/${params.title}`;

    try {
        const response = await fetch( url, { cache: 'force-cache' } );
        if ( !response.ok ) {
            throw new Error( 'Network response not ok.' );
        }
        const photoDataList = await response.json();
        const chunkedList = await chunkArray( photoDataList, 2 );

        return {
            props: { data: chunkedList },
        };
    } catch (error) {
        console.error( "Fetch error: ", error );
        return { props: { data: [] } }; // return empty data in case of error
    }
}

async function chunkArray( photoArray, chunkSize ) {
    let result = [];
    for (let i = 0; i < photoArray.length; i += chunkSize) {
        result.push( photoArray.slice( i, i + chunkSize ) );
    }
    return result;
}

// The page component that renders the content for each title
const TitlePage = ( { data } ) => {
    const [photoList, setPhotoList] = useState( [] );
    const router = useRouter();
    if ( !data ) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>{router.query.title}</h1>
            <div>
                {/*{data.map( ( photo, index ) => (*/}
                {/*    <div key={index}>*/}
                {/*        <img src={`/${photo.title}`} alt={`Photo ${index + 1}`} style={{ maxWidth: "1000px" }}/>*/}
                {/*    </div>*/}
                {/*) )}*/}
                {data.map( ( photoPair, index ) => (
                    <PhotoBlockComponent key={index} photos={photoPair}/>
                ) )}
            </div>
        </div>
    );
};

export default TitlePage;