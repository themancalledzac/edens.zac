import { useEffect } from 'react';

import ParallaxSection from '@/Components/ParallaxSection/ParallaxSection';
import ParallaxSectionWrapper from '@/Components/ParallaxSectionWrapper';
import { useEditContext } from '@/context/EditContext';
import { fetchHomePage } from '@/lib/api/home';
import { HomeCardModel } from '@/types/HomeCardModel';

import Header from '../Components/Header/Header';
import styles from '../styles/Home.module.scss';

export async function getServerSideProps() {
  try {

    // Fetch home cards from API
    const homeCards = await fetchHomePage();

    return {
      props: { homeCards },
    };

    // // const response = await fetch(url, {cache: 'force-cache'});
    // const data = await response.json();
    // const sortedData = data.sort((a, b) => a.priority - b.priority);
    // return {props: {homePageCatalogList: sortedData}};
  } catch (error) {
    console.error('Fetch error:', error);
    return {
      notFound: true,
    };
  }
}

export default function Home({ homeCards }) {
  const { setIsEditMode, setIsCreateMode } = useEditContext();


  // TODO: Need to handle homeCards being null
  const cardPairs: HomeCardModel[][] = [];
  for (let i = 0; i < homeCards?.length; i += 2) {
    cardPairs.push(homeCards.slice(i, Math.min(i + 2, homeCards.length)));
    // cardPairs.push(homeCards.slice(i, i + 2));
  }

  /**
   * Hook to reset our home page to neither edit nor create modes.
   */
  useEffect(() => {
    setIsEditMode(false);
    setIsCreateMode(false);
    console.log(process.env.NEXT_PUBLIC_API_URL);
    
  }, []);

  return (
    <div className={styles.container}>
      <Header />

      <div className={styles.bodyWrapper}>
        {cardPairs.map((pair) => (
          <ParallaxSectionWrapper key={pair[0].id}>
            {pair.map((card) => (
              <ParallaxSection
                key={card.id}
                card={card}
              />
            ))}
          </ParallaxSectionWrapper>
        ))}
      </div>
      {/*<Footer />*/}
    </div>
  );
}
