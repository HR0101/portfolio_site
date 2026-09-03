import { Hero } from '../sections/Hero';
import { About } from '../sections/About';
import { Skills } from '../sections/Skills';
import { Projects } from '../sections/Projects';
import { GitHubActivity } from '../sections/GitHubActivity';
import { Contact } from '../sections/Contact';

// ランディングページ：全セクションを順に描画する
export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Skills />
      <Projects />
      <GitHubActivity />
      <Contact />
    </>
  );
}
