import { useHashRouter } from './hooks/useHashRouter';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Hero } from './sections/Hero';
import { Projects } from './sections/Projects';
import { Skills } from './sections/Skills';
import { Timeline } from './sections/Timeline';
import { Blog } from './sections/Blog';
import { BlogDetail } from './sections/BlogDetail';

function App() {
  const { currentHash, route, id } = useHashRouter();

  const renderContent = () => {
    switch (route) {
      case '#about':
        return <Hero />;
      case '#projects':
        return <Projects />;
      case '#skills':
        return <Skills />;
      case '#timeline':
        return <Timeline />;
      case '#blog':
        return <Blog />;
      case 'blog-detail':
        return <BlogDetail id={id || ''} />;
      default:
        return <Hero />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar currentHash={currentHash} />
      <main className="flex-grow">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}

export default App;
