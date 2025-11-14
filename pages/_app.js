import '../styles/globals.css';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * App:
 * - Global metadata & font preconnect
 * - Prism.js highlighting: triggers on route change & initial mount
 * - Future enhancement: centralize analytics; currently stubbed GA
 */
export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    function highlight() {
      // Allow deferred Prism scripts time to register.
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.Prism?.highlightAll) {
          window.Prism.highlightAll();
        }
      }, 30);
    }
    highlight();
    router.events.on('routeChangeComplete', highlight);
    return () => {
      router.events.off('routeChangeComplete', highlight);
    };
  }, [router.events]);

  return (
    <>
      <Head>
        <title>Vibe CLI — Free AI Coding Assistant</title>
        <meta
          name="description"
          content="Vibe: Free AI coding CLI with agentic workflows, OpenRouter integration, and terminal-first UX."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Vibe CLI" />
        <meta
          property="og:description"
          content="Free, terminal-first AI coding assistant with OpenRouter free models."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vibe-cli.example" />
        <meta property="og:image" content="/og.png" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Prism.js for code highlighting */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/prismjs/themes/prism-tomorrow.min.css"
        />
        <script src="https://cdn.jsdelivr.net/npm/prismjs/prism.min.js" defer></script>
        <script
          src="https://cdn.jsdelivr.net/npm/prismjs/components/prism-javascript.min.js"
          defer
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/prismjs/components/prism-bash.min.js"
          defer
        ></script>

        {/* Analytics stub */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;ga('create','UA-XXXXX-Y','auto');ga('send','pageview');",
          }}
        />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}
