import styles from '../../styles/Home.module.scss';

export function CodingPage() {

  function getRandomElementFromArray(array: string | any[]) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
  }

  return (
    <div className={styles.bodyWrapper}>
      <div>coding</div>
    </div>
  );
}

