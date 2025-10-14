import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Index() {
  const [activeSection, setActiveSection] = useState("beranda");
  const [scrolled, setScrolled] = useState(false);
  const [openFaqId, setOpenFaqId] = useState("q1");

  const HEADER_HEIGHT = 90;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);

      const sections = ["beranda", "tentang", "kata", "faq"];
      const scrollPosition = window.scrollY + HEADER_HEIGHT + 100;

      for (const section of sections) {
        const element = document.getElementById(`section-${section}`);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      const offsetPosition = element.offsetTop - HEADER_HEIGHT;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? "" : id);
  };

  const navLinks = [
    { id: "beranda", label: "Beranda" },
    { id: "tentang", label: "Tentang" },
    { id: "kata", label: "Kata Mereka" },
    { id: "faq", label: "FAQ" },
  ];

  const features = [
    {
      title: "Soal Terbaru & Relevan",
      description:
        "Soal Pilihan yang Diantaranya Diambil Dari soal Tes UTBK Tahun Sebelumnya dan Merupakan Soal Terbaik UTBK SBMPTN.",
    },
    {
      title: "Pembahasan To-The-Point",
      description:
        "Setiap soal dilengkapi penjelasan singkat dan ringkasan topik, jadi lebih cepat paham.",
    },
    {
      title: "Akses Fleksibel & Terjangkau",
      description:
        "Soal Pilihan yang Diantaranya Diambil Dari soal Tes UTBK Tahun Sebelumnya dan Merupakan Soal Terbaik UTBK SBMPTN.",
    },
    {
      title: "Rekomendasi Nilai",
      description:
        "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt",
    },
  ];

  const testimonials = Array(6).fill({
    text: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt",
    name: "Nurianti",
    school: "SMAN 1 Bandung",
  });

  const faqs = [
    {
      id: "q1",
      question: "Lorem Ipsum dolor sit amet?",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse sed ligula bibendum, varius purus sit amet, cursus est. Maecenas rhoncus condimentum ex eu fringilla. Sed et elit eros. Mauris blandit a nibh vel interdum. Donec lectus orci, eleifend sit amet nibh sit amet, interdum dictum magna. Etiam vel est sagittis, cursus lectus ac, consectetur nisi.",
    },
    {
      id: "q2",
      question: "Lorem Ipsum dolor sit amet?",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse sed ligula bibendum, varius purus sit amet, cursus est.",
    },
    {
      id: "q3",
      question: "Lorem Ipsum dolor sit amet?",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse sed ligula bibendum, varius purus sit amet, cursus est.",
    },
    {
      id: "q4",
      question: "Lorem Ipsum dolor sit amet?",
      answer:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse sed ligula bibendum, varius purus sit amet, cursus est.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header
        id="site-header"
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? "shadow-lg" : "shadow-sm"
        }`}
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <div className="max-w-[1440px] mx-auto px-20 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/056e44ae50afd87b86caf37ee90c602560068704?width=112"
              alt="Kelas Kampus Logo"
              className="w-14 h-14 rounded-full"
            />
          </div>

          <nav className="flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                aria-current={activeSection === link.id ? "page" : undefined}
                className={`text-xl font-normal transition-colors ${
                  activeSection === link.id
                    ? "text-brand-blue font-semibold border-b-2 border-brand-blue"
                    : "text-black hover:text-brand-blue"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <Link
            to="/signin"
            className="bg-brand-dark-blue text-white px-8 py-2.5 rounded-md text-base font-medium hover:opacity-90 transition-opacity"
          >
            Masuk
          </Link>
        </div>
      </header>

      {/* Snap container + padding top mengimbangi header */}
      <main
        style={{ paddingTop: `${HEADER_HEIGHT}px` }}
        className="snap-y snap-mandatory"
      >
        {/* BERANDA */}
        <section
          id="section-beranda"
          className="py-16 px-20 min-h-[calc(100vh-90px)] flex items-center snap-start scroll-mt-[90px]"
          style={{ minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` }}
        >
          <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-12">
              <div className="space-y-8">
                <h1 className="text-5xl font-bold text-black leading-[65px]">
                  Tryout SNBT 2026
                  <br />
                  Menuju PTN Impianmu!
                </h1>
                <p className="text-[23px] text-[#243044] leading-10 tracking-wide max-w-[618px]">
                  Belajar efektif, nilai maksimal. Mulai dari Try Out Online
                  sekarang juga!
                </p>
              </div>
              <button
                onClick={() => scrollToSection("faq")}
                className="bg-brand-dark-blue text-white px-12 py-5 rounded-md text-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Coba Gratis Sekarang!
              </button>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/9cdd5a674b7039d1a08b5a2aa20e05d48a5e4c0d?width=610"
                    alt="Student studying"
                    className="w-full h-[244px] object-cover rounded-[20px] shadow-lg"
                    loading="lazy"
                  />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-6">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/880de53844112cd77e452bbe48bfb36c59b365d8?width=794"
                    alt="Student with books"
                    className="w-full h-[241px] object-cover rounded-[20px] shadow-lg"
                    loading="lazy"
                  />
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/d5dcf260587d92684c1286ebe6b8b7e17019e9a3?width=518"
                    alt="Student portrait"
                    className="w-full h-[241px] object-cover rounded-[20px] shadow-lg"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="absolute top-40 -left-8 w-8 h-12">
                <div className="w-0.5 h-14 bg-[#243044] rotate-[29deg]"></div>
                <div className="w-1.5 h-1.5 bg-[#243044] rounded-full absolute bottom-0 right-0"></div>
              </div>
              <div className="absolute top-44 -left-16 w-8 h-12">
                <div className="w-0.5 h-14 bg-brand-dark-blue -rotate-[68deg]"></div>
                <div className="w-1.5 h-1.5 bg-brand-dark-blue rounded-full absolute top-0 left-0"></div>
              </div>
              <div className="absolute bottom-32 -left-12 w-10 h-10 bg-[#EC8C1C] rounded-full flex items-center justify-center">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 26 26"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 0.874252L25.8212 9.20833L23.8333 10.5008V17.3333H21.6667V11.9091L20.5833 12.6133V18.9583C20.5833 20.5508 19.4848 21.7913 18.1426 22.5756C16.7722 23.374 14.9522 23.8323 13 23.8323C11.0478 23.8323 9.22674 23.374 7.85741 22.5756C6.51407 21.7913 5.41666 20.5498 5.41666 18.9573V12.6133L0.178741 9.20833L13 0.874252ZM7.58332 14.0216V18.9583C7.58332 19.4599 7.94082 20.1143 8.94941 20.7025C9.93307 21.2767 11.362 21.6667 13 21.6667C14.638 21.6667 16.0669 21.2767 17.0506 20.7025C18.0602 20.1143 18.4156 19.4599 18.4156 18.9583V14.0216L12.9989 17.5424L7.58332 14.0216ZM21.8454 9.20833L13 3.45909L4.15458 9.20833L13 14.9576L21.8454 9.20833Z"
                    fill="black"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* TENTANG */}
        <section
          id="section-tentang"
          className="py-16 bg-band-about rounded-[50px] mx-0 min-h-[calc(100vh-90px)] flex items-center snap-start scroll-mt-[90px]"
          style={{ minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` }}
        >
          <div className="max-w-[1280px] mx-auto px-20">
            <h2 className="text-[35px] font-bold text-center mb-16 tracking-wide">
              Kenapa {" "}
              <span className="bg-gradient-to-br from-[#243044] to-[#5A78AA] bg-clip-text text-transparent">
                Kelas Kampus
              </span>{" "}
              pilihan terbaik?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center space-y-4"
                >
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/c943f134a653c60e0e60ae4c6625a90acf9b38f9?width=142"
                    alt="Feature icon"
                    className="w-[71px] h-[71px]"
                  />
                  <h3 className="text-xl font-bold text-black">{feature.title}</h3>
                  <p className="text-base text-black tracking-wide leading-normal">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* KATA MEREKA */}
        <section
          id="section-kata"
          className="py-16 bg-band-testimonial min-h-[calc(100vh-90px)] flex items-center snap-start scroll-mt-[90px]"
          style={{ minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` }}
        >
          <div className="max-w-[1280px] mx-auto px-20">
            <h2 className="text-[35px] font-bold text-center text-[#243044] mb-16 tracking-[3.5px] leading-normal">
              Belajar lebih percaya diri
              <br />
              dari <span className="text-[#243044]">pengalaman nyata</span> pengguna
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.slice(0, 6).map((testimonial, idx) => (
                <div key={idx} className="bg-testimonial-card rounded-[35px] p-8 space-y-6">
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="22" cy="22" r="21.5" stroke="white" strokeOpacity="0.61" />
                    <path d="M29.9157 30.6212C30.4224 30.6212 30.9084 30.4347 31.2667 30.1027C31.625 29.7707 31.8263 29.3204 31.8263 28.8509V24.5278C31.8263 24.0583 31.625 23.608 31.2667 23.276C30.9084 22.944 30.4224 22.7575 29.9157 22.7575H27.2637C27.2637 22.1355 27.3032 21.5136 27.3822 20.8916C27.5006 20.2331 27.6981 19.6477 27.9745 19.1355C28.2509 18.6233 28.6069 18.2202 29.0425 17.9264C29.4756 17.5971 30.0284 17.4324 30.7009 17.4324V14.6885C29.5953 14.6885 28.6273 14.908 27.7968 15.347C26.972 15.7805 26.2634 16.3808 25.7237 17.1032C25.1804 17.8983 24.7803 18.7701 24.5391 19.6843C24.2953 20.6929 24.1761 21.7239 24.1838 22.7575V28.8509C24.1838 29.3204 24.3851 29.7707 24.7434 30.1027C25.1017 30.4347 25.5877 30.6212 26.0944 30.6212H29.9157ZM18.4519 30.6212C18.9586 30.6212 19.4446 30.4347 19.8029 30.1027C20.1612 29.7707 20.3625 29.3204 20.3625 28.8509V24.5278C20.3625 24.0583 20.1612 23.608 19.8029 23.276C19.4446 22.944 18.9586 22.7575 18.4519 22.7575H15.7999C15.7999 22.1355 15.8394 21.5136 15.9184 20.8916C16.0381 20.2331 16.2355 19.6477 16.5107 19.1355C16.7871 18.6233 17.1431 18.2202 17.5787 17.9264C18.0118 17.5971 18.5646 17.4324 19.2371 17.4324V14.6885C18.1315 14.6885 17.1635 14.908 16.333 15.347C15.5082 15.7805 14.7996 16.3808 14.2599 17.1032C13.7166 17.8983 13.3165 18.7701 13.0753 19.6843C12.8315 20.6929 12.7123 21.7239 12.72 22.7575V28.8509C12.72 29.3204 12.9213 29.7707 13.2796 30.1027C13.6379 30.4347 14.1239 30.6212 14.6306 30.6212H18.4519Z" fill="#295782" />
                  </svg>

                  <p className="text-base text-black tracking-wide leading-normal">{testimonial.text}</p>

                  <div className="pt-4 border-t border-black/10 flex items-center gap-3">
                    <img src="https://api.builder.io/api/v1/image/assets/TEMP/d1fa766f6b56da812c203b9a963db3fc04f8d771?width=88" alt={testimonial.name} className="w-11 h-11 rounded-full" />
                    <div>
                      <div className="text-base font-semibold text-black">{testimonial.name}</div>
                      <div className="text-base text-black">{testimonial.school}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="section-faq"
          className="py-16 bg-band-faq rounded-b-[70px] min-h-[calc(100vh-90px)] flex items-center snap-start scroll-mt-[90px]"
          style={{ minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` }}
        >
          <div className="max-w-[1280px] mx-auto px-20">
            <h2 className="text-[35px] font-bold text-center text-black mb-16 tracking-[3.5px]">FREQUENTLY ASK QUESTION (FAQ)</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.id} className="bg-white rounded-[20px] overflow-hidden transition-all duration-250">
                    <button onClick={() => toggleFaq(faq.id)} className="w-full px-6 py-4 flex items-center justify-between text-left">
                      <span className="text-xl font-bold text-[#243044] tracking-wide">{faq.question}</span>
                      {openFaqId === faq.id ? (
                        <ChevronUp className="w-5 h-5 text-[#243044] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#243044] flex-shrink-0" />
                      )}
                    </button>
                    <div className={`transition-all duration-250 ${openFaqId === faq.id ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
                      <div className="px-6 pb-6">
                        <p className="text-base text-black tracking-wide leading-normal">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden lg:flex justify-center items-center">
                <img src="https://api.builder.io/api/v1/image/assets/TEMP/0bbe8e77085868b6e17f4c0a58379c86a7dec91e?width=1462" alt="FAQ illustration" className="w-full max-w-[731px] h-auto" loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        <footer className="py-16 px-20 border-t border-black/10">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-4">
              <span className="text-base font-bold text-black tracking-wide">HUB</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-8">
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-black">Kelas Kampus</h3>
                <p className="text-base text-black/55">Descriptive line about what your company does.</p>
                <div className="flex items-center gap-6">
                  <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-semibold">f</a>
                  <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#515BD4] flex items-center justify-center text-white text-sm font-semibold">ig</a>
                  <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white text-sm font-semibold">t</a>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-base font-semibold text-black mb-6">Features</h4>
                <div className="space-y-2">
                  <p className="text-base text-black/55">Core features</p>
                  <p className="text-base text-black/55">Pro experience</p>
                  <p className="text-base text-black/55">Integrations</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-base font-semibold text-black mb-6">Learn more</h4>
                <div className="space-y-2">
                  <p className="text-base text-black/55">Blog</p>
                  <p className="text-base text-black/55">Case studies</p>
                  <p className="text-base text-black/55">Customer stories</p>
                  <p className="text-base text-black/55">Best practices</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-base font-semibold text-black mb-6">Support</h4>
                <div className="space-y-2">
                  <p className="text-base text-black/55">Contact</p>
                  <p className="text-base text-black/55">Support</p>
                  <p className="text-base text-black/55">Legal</p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
