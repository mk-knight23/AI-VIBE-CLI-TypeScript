import { useEffect, useState } from 'react';

export default function Testimonials() {
  const quotes = [
    { q: 'I ship PRs faster without leaving my shell.', a: 'Lena Ortiz, Staff Engineer' },
    { q: 'Great dev UX. It feels native to my terminal.', a: 'Vikram Shah, Senior Developer' },
    { q: 'OpenRouter flexibility fits our team.', a: 'Mia Chang, Engineering Manager' },
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  function prev() {
    setIndex((i) => (i - 1 + quotes.length) % quotes.length);
  }
  function next() {
    setIndex((i) => (i + 1) % quotes.length);
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-14" aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="text-2xl md:text-3xl font-bold">What developers say</h2>

      <div className="mt-6 relative border border-gray-800 rounded-lg bg-black/20 p-6">
        <div className="min-h-[120px]">
          <p className="text-lg">“{quotes[index].q}”</p>
          <p className="mt-3 text-sm text-gray-400">— {quotes[index].a}</p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            className="text-xs px-2 py-1 rounded bg-gray-700/70 hover:bg-gray-600 text-gray-200"
            aria-label="Previous testimonial"
          >
            ◀ Prev
          </button>
          <div className="flex gap-1" aria-label="Slide indicators">
            {quotes.map((_, i) => (
              <span
                key={i}
                className={'inline-block w-2 h-2 rounded-full ' + (i === index ? 'bg-primary' : 'bg-gray-600')}
                aria-hidden="true"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="text-xs px-2 py-1 rounded bg-gray-700/70 hover:bg-gray-600 text-gray-200"
            aria-label="Next testimonial"
          >
            Next ▶
          </button>
        </div>
      </div>
    </section>
  );
}
