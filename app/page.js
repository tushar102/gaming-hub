import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css"; // We'll define this next

export const metadata = {
  title: "Best Online Games | Play Free",
  description:
    "Play a huge collection of free games online. No downloads, no registration!",
};

export default function HomePage() {
  const games = [
    {
      title: "Balloon Shooter",
      slug: "bubble-shooter",
      thumbnail: "/game17.jpg",
    },
    { title: "3D Car Racing", slug: "car-racing", thumbnail: "/game1.jpg" },
    {
      title: "Digital Board Game",
      slug: "digital-board",
      thumbnail: "/game15.jpg",
    },
    { title: "Dodging Game", slug: "dodging-game", thumbnail: "/game13.jpg" },
    { title: "Fishing Game", slug: "fishing-game", thumbnail: "/game12.jpg" },
    {
      title: "Mini Golf Challenge",
      slug: "golf-game",
      thumbnail: "/game20.jpg",
    },
    {
      title: "Hill Climb Racing",
      slug: "hillracing-climb",
      thumbnail: "/game21.jpg",
    },
    {
      title: "Quick Reaction Game",
      slug: "quick-reaction",
      thumbnail: "/game10.jpg",
    },
    {
      title: "Spot the Difference",
      slug: "spot-difference",
      thumbnail: "/game19.jpg",
    },
    { title: "Stack the Cards", slug: "stack-cards", thumbnail: "/game16.jpg" },
    { title: "Tower Builder", slug: "tower-builder", thumbnail: "/game3.jpg" },
  ];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <nav className={styles.navbar}>
          <h1 className={styles.logo}>Game Hub</h1>
        </nav>
        <h2 className={styles.title}>Play Online Free Games</h2>
      </header>

      <div className={styles.grid}>
        {games.map((game, index) => (
          <Link key={index} href={`/${game.slug}`} className={styles.cardLink}>
            <div className={styles.card}>
              <Image
                src={game.thumbnail}
                width={180}
                height={120}
                alt={game.title}
                className={styles.thumbnail}
              />
              <h3 className={styles.cardTitle}>{game.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
