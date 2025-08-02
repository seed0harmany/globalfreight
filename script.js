document.addEventListener('DOMContentLoaded', () => {
    // State machine for tracking
    const trackingMachine = {
        state: 'idle',
        context: {
            waybill: '',
            shipment: null,
            error: null,
            retryCount: 0,
            maxRetries: 3
        },

        transitions: {
            idle: { track: 'loading', clear: 'idle' },
            loading: { success: 'success', error: 'error', timeout: 'timeout' },
            success: { clear: 'idle', retry: 'loading' },
            error: { clear: 'idle', retry: 'loading' },
            timeout: { retry: 'loading', clear: 'idle' }
        },

        dispatch(action, payload) {
            try {
                const nextState = this.transitions[this.state][action];
                if (nextState) {
                    this.state = nextState;
                    this.context = { ...this.context, ...payload };
                    this.handleState();
                } else {
                    console.error(`Invalid transition from ${this.state} with action ${action}`);
                }
            } catch (error) {
                console.error('State transition error:', error);
            }
        },

        handleState() {
            const elements = {
                form: document.getElementById('tracking-form'),
                input: document.getElementById('waybill-number'),
                result: document.getElementById('tracking-result'),
                error: document.getElementById('tracking-error'),
                timeout: document.getElementById('timeout-error'),
                loading: document.getElementById('loading'),
                clearBtn: document.getElementById('clear-button'),
                checkpoints: document.getElementById('checkpoint-details'),
                progressBar: document.getElementById('progress-bar'),
                timeline: document.getElementById('timeline-section'),
                toggleBtn: document.getElementById('toggle-timeline')
            };

            if (!elements.form || !elements.input) {
                console.error('Tracking form or input not found');
                return;
            }

            switch (this.state) {
                case 'idle':
                    elements.result?.classList.add('hidden');
                    elements.error?.classList.add('hidden');
                    elements.timeout?.classList.add('hidden');
                    elements.loading?.classList.add('hidden');
                    elements.clearBtn?.classList.add('hidden');
                    if (elements.checkpoints) elements.checkpoints.innerHTML = '';
                    elements.input.value = this.context.waybill;
                    elements.input.focus();
                    break;
                case 'loading':
                    elements.result?.classList.add('hidden');
                    elements.error?.classList.add('hidden');
                    elements.timeout?.classList.add('hidden');
                    elements.loading?.classList.remove('hidden');
                    elements.clearBtn?.classList.add('hidden');
                    this.fetchShipment();
                    break;
                case 'success':
                    elements.result?.classList.remove('hidden');
                    elements.error?.classList.add('hidden');
                    elements.timeout?.classList.add('hidden');
                    elements.loading?.classList.add('hidden');
                    elements.clearBtn?.classList.remove('hidden');
                    this.renderShipment(elements);
                    break;
                case 'error':
                    elements.result?.classList.add('hidden');
                    elements.error?.classList.remove('hidden');
                    elements.timeout?.classList.add('hidden');
                    elements.loading?.classList.add('hidden');
                    elements.clearBtn?.classList.add('hidden');
                    elements.input.focus();
                    break;
                case 'timeout':
                    elements.result?.classList.add('hidden');
                    elements.error?.classList.add('hidden');
                    elements.timeout?.classList.remove('hidden');
                    elements.loading?.classList.add('hidden');
                    elements.clearBtn?.classList.add('hidden');
                    elements.input.focus();
                    break;
                default:
                    console.error(`Unknown state: ${this.state}`);
            }
        },

        async fetchShipment() {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const waybill = this.context.waybill;
                if (!/GFRT-\d{6}-[A-Z]{3}/.test(waybill)) {
                    throw new Error('Invalid waybill format');
                }

                this.context.shipment = {
                    waybill,
                    status: 'In Transit',
                    eta: 'August 5, 2025',
                    lastCheckpoint: 'Port of Singapore, 2025-07-24 09:15 UTC',
                    carrierRef: 'MSK-V12345',
                    origin: 'Shanghai, China',
                    destination: 'Los Angeles, CA',
                    carrier: 'Maersk',
                    type: 'Sea Freight',
                    checkpoints: [
                        { status: 'Booked', date: '2025-07-20', location: 'Shanghai, China', details: 'Shipment booked and processed.' },
                        { status: 'In Transit', date: '2025-07-24', location: 'Port of Singapore', details: 'Shipment arrived at intermediate port.' }
                    ]
                };

                if (this.context.retryCount >= this.context.maxRetries) {
                    this.dispatch('timeout');
                    return;
                }

                this.dispatch('success');
            } catch (error) {
                this.context.error = error.message;
                this.context.retryCount++;
                if (this.context.retryCount >= this.context.maxRetries) {
                    this.dispatch('timeout');
                } else {
                    this.dispatch('error');
                }
            }
        },

        renderShipment(elements) {
            if (!this.context.shipment) return;

            const { shipment } = this.context;

            document.getElementById('shipment-waybill').textContent = shipment.waybill;
            document.getElementById('shipment-status').textContent = shipment.status;
            document.getElementById('shipment-eta').textContent = shipment.eta;
            document.getElementById('shipment-checkpoint').textContent = shipment.lastCheckpoint;
            document.getElementById('shipment-carrier-ref').textContent = shipment.carrierRef;
            document.getElementById('shipment-origin').textContent = shipment.origin;
            document.getElementById('shipment-destination').textContent = shipment.destination;
            document.getElementById('shipment-carrier').textContent = shipment.carrier;
            document.getElementById('shipment-type').textContent = shipment.type;

            const checkpoints = document.querySelectorAll('#tracking button[data-status]');
            checkpoints.forEach(btn => {
                const status = btn.getAttribute('data-status');
                const dot = btn.querySelector('.checkpoint');
                if (shipment.checkpoints.some(cp => cp.status === status)) {
                    dot.classList.add('bg-gold', 'animate-checkpoint-pulse');
                    dot.classList.remove('bg-gray-50', 'border', 'border-gray-200');
                    btn.setAttribute('aria-current', 'true');
                } else {
                    dot.classList.remove('bg-gold', 'animate-checkpoint-pulse');
                    dot.classList.add('bg-gray-50', 'border', 'border-gray-200');
                    btn.setAttribute('aria-current', 'false');
                }
            });

            const progress = (shipment.checkpoints.length / 5) * 100;
            elements.progressBar.style.setProperty('--progress-width', `${progress}%`);

            elements.checkpoints.innerHTML = shipment.checkpoints.map(cp => `
                <div class="text-sm text-steel-gray">
                    <p class="font-semibold">${cp.status}</p>
                    <p>${cp.date} - ${cp.location}</p>
                    <p>${cp.details}</p>
                </div>
            `).join('');

            elements.toggleBtn.textContent = elements.timeline.classList.contains('hidden') ? 'Show Timeline' : 'Hide Timeline';
        }
    };

    // Navbar toggle functionality
    const initNavbar = () => {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuClose = document.getElementById('mobile-menu-close');
        const mobileMenuBackdrop = document.querySelector('.mobile-menu-backdrop');
        const mobileMenuContent = document.querySelector('.mobile-menu-content');

        const toggleMobileMenu = () => {
            const isOpen = !mobileMenu.classList.contains('hidden');
            mobileMenu.classList.toggle('hidden', isOpen);
            mobileMenuBackdrop.classList.toggle('hidden', isOpen);
            mobileMenuContent.classList.toggle('hidden', isOpen);
            mobileMenuButton.setAttribute('aria-expanded', !isOpen);
            if (!isOpen) {
                mobileMenuContent.focus();
                // Stagger submenu animations on open
                const submenus = mobileMenuContent.querySelectorAll('.animate-submenu-slide');
                submenus.forEach((submenu, index) => {
                    submenu.style.animationDelay = `${index * 0.1}s`;
                });
            } else {
                mobileMenuButton.focus();
            }
        };

        if (mobileMenuButton && mobileMenu && mobileMenuClose && mobileMenuBackdrop && mobileMenuContent) {
            mobileMenuButton.addEventListener('click', toggleMobileMenu);
            mobileMenuClose.addEventListener('click', toggleMobileMenu);
            mobileMenuBackdrop.addEventListener('click', toggleMobileMenu);

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
                    toggleMobileMenu();
                }
            });
        }

        const submenus = [
            { button: 'mobile-services-menu', submenu: 'mobile-services-submenu' },
            { button: 'mobile-why-menu', submenu: 'mobile-why-submenu' },
            { button: 'mobile-language-menu', submenu: 'mobile-language-submenu' }
        ];

        submenus.forEach(({ button, submenu }) => {
            const btn = document.getElementById(button);
            const sub = document.getElementById(submenu);
            if (btn && sub) {
                btn.addEventListener('click', () => {
                    const isOpen = !sub.classList.contains('hidden');
                    sub.classList.toggle('hidden', isOpen);
                    btn.setAttribute('aria-expanded', !isOpen);
                    if (!isOpen) {
                        sub.querySelectorAll('a').forEach((link, index) => {
                            link.style.animationDelay = `${index * 0.05}s`;
                        });
                    }
                });
            }
        });
    };

    // Hero headline rotation
    const initHeroHeadline = () => {
        const headlines = [
            'Global Logistics You Can Trust',
            'Seamless Cargo Solutions Worldwide',
            'Your Partner in Supply Chain Success',
            'Fast. Reliable. Global.'
        ];
        let currentIndex = 0;
        const headline1 = document.getElementById('hero-headline-1');
        const headline2 = document.getElementById('hero-headline-2');

        if (!headline1 || !headline2) return;

        // Set initial state
        headline1.textContent = headlines[currentIndex];
        headline1.classList.add('active');

        const rotateHeadline = () => {
            const nextIndex = (currentIndex + 1) % headlines.length;
            const isFirstActive = headline1.classList.contains('active');

            // Set next headline text and prepare for transition
            const nextHeadline = isFirstActive ? headline2 : headline1;
            const currentHeadline = isFirstActive ? headline1 : headline2;

            nextHeadline.textContent = headlines[nextIndex];
            nextHeadline.classList.remove('hidden');
            nextHeadline.classList.add('animate-textFade-in');

            currentHeadline.classList.add('animate-textFade-out');

            setTimeout(() => {
                currentHeadline.classList.remove('active', 'animate-textFade-out');
                currentHeadline.classList.add('hidden');
                nextHeadline.classList.remove('animate-textFade-in');
                nextHeadline.classList.add('active');
                currentIndex = nextIndex;
            }, 500); // Matches fade animation duration
        };

        // Start rotation after 5 seconds, then every 5 seconds
        setTimeout(() => {
            setInterval(rotateHeadline, 5000);
            rotateHeadline();
        }, 5000);
    };

    // Initialize components
    initNavbar();
    initHeroHeadline();

    // Global tracking functions
    window.trackShipment = () => {
        const waybill = document.getElementById('waybill-number').value.trim();
        if (!waybill) {
            const error = document.getElementById('tracking-error');
            error.classList.remove('hidden');
            error.classList.add('animate-shake');
            setTimeout(() => error.classList.remove('animate-shake'), 400);
            return;
        }
        trackingMachine.dispatch('track', { waybill });
    };

    window.clearTracking = () => {
        trackingMachine.dispatch('clear', { waybill: '', shipment: null, error: null, retryCount: 0 });
    };

    window.retry = () => {
        trackingMachine.dispatch('retry');
    };

    window.downloadReport = () => {
        alert('Downloading shipment report...');
    };

    window.contactSupport = () => {
        window.location.href = '#contact';
    };

    // Toggle timeline visibility
    const toggleTimeline = document.getElementById('toggle-timeline');
    if (toggleTimeline) {
        toggleTimeline.addEventListener('click', () => {
            const timeline = document.getElementById('timeline-section');
            if (timeline) {
                timeline.classList.toggle('hidden');
                toggleTimeline.textContent = timeline.classList.contains('hidden') ? 'Show Timeline' : 'Hide Timeline';
                toggleTimeline.setAttribute('aria-expanded', !timeline.classList.contains('hidden'));
            }
        });
    }

    // Language toggle
    window.changeLanguage = (lang) => {
        alert(`Language changed to ${lang}`);
    };

    // Service modals
    const serviceButtons = document.querySelectorAll('[data-service]');
    const serviceModal = document.getElementById('service-modal');
    const serviceModalClose = document.getElementById('modal-close');
    const serviceModalHeading = document.getElementById('modal-heading');
    const serviceModalImage = document.getElementById('modal-image');
    const serviceModalDescription = document.getElementById('modal-description');
    const serviceModalBenefits = document.getElementById('modal-benefits')?.querySelector('ul');
    const serviceModalUseCases = document.getElementById('modal-use-cases')?.querySelector('ul');

    const serviceData = {
        air: {
            heading: 'Air Freight',
            image: 'https://images.unsplash.com/photo-1700114339471-9e90a155d4b7',
            description: 'Our Air Freight services provide rapid, reliable delivery for time-sensitive cargo, ensuring your goods reach their destination on schedule.',
            benefits: [
                'Fastest delivery times for urgent shipments',
                'Global reach with major airline partnerships',
                'Real-time tracking and updates'
            ],
            useCases: [
                'Electronics and high-value goods',
                'Pharmaceuticals and medical supplies',
                'Perishable items like fresh produce'
            ]
        },
        sea: {
            heading: 'Sea Freight',
            image: 'https://images.unsplash.com/photo-1591047138822-517a80b3c4cd',
            description: 'Our Sea Freight services offer cost-effective solutions for bulk cargo, with reliable schedules and comprehensive port coverage.',
            benefits: [
                'Economical for large shipments',
                'Environmentally friendly option',
                'Flexible container options (FCL/LCL)'
            ],
            useCases: [
                'Raw materials and commodities',
                'Consumer goods and retail products',
                'Heavy machinery and equipment'
            ]
        },
        land: {
            heading: 'Land Transport',
            image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f',
            description: 'Our Land Transport services provide efficient road and rail solutions for domestic and cross-border shipments, tailored to your needs.',
            benefits: [
                'Flexible scheduling and routes',
                'Door-to-door delivery options',
                'Integrated with air and sea services'
            ],
            useCases: [
                'Regional distribution',
                'Cross-border trade',
                'Last-mile delivery'
            ]
        },
        customs: {
            heading: 'Customs Clearance',
            image: 'https://images.unsplash.com/photo-1586528116022-aeda1613d4b7',
            description: 'Our Customs Clearance services ensure compliance with global regulations, streamlining the import/export process for your shipments.',
            benefits: [
                'Expert handling of documentation',
                'Reduced delays at borders',
                'Compliance with international trade laws'
            ],
            useCases: [
                'Complex international shipments',
                'High-value or regulated goods',
                'Multi-country supply chains'
            ]
        }
    };

    serviceButtons.forEach(button => {
        button.addEventListener('click', () => {
            const service = button.getAttribute('data-service');
            const data = serviceData[service];
            if (!data) return;

            serviceModalHeading.textContent = data.heading;
            serviceModalImage.src = data.image;
            serviceModalImage.alt = `Image representing ${data.heading} service`;
            serviceModalImage.classList.remove('hidden');
            serviceModalDescription.textContent = data.description;
            serviceModalBenefits.innerHTML = data.benefits.map(b => `<li>${b}</li>`).join('');
            serviceModalUseCases.innerHTML = data.useCases.map(u => `<li>${u}</li>`).join('');
            serviceModal.classList.remove('hidden');
            serviceModal.setAttribute('aria-hidden', 'false');
            serviceModal.querySelector('.modal-content')?.focus();
        });
    });

    serviceModalClose?.addEventListener('click', () => {
        serviceModal.classList.add('hidden');
        serviceModal.setAttribute('aria-hidden', 'true');
    });

    // Success story modals
    const successButtons = document.querySelectorAll('[data-case]');
    const successModal = document.getElementById('success-story-modal');
    const successModalClose = document.getElementById('success-modal-close');
    const successModalHeading = document.getElementById('success-modal-heading');
    const successModalQuote = document.getElementById('success-modal-quote');
    const successModalDescription = document.getElementById('success-modal-description');
    const successModalResults = document.getElementById('success-modal-results')?.querySelector('ul');
    const successModalIndustries = document.getElementById('success-modal-industries')?.querySelector('ul');

    const successData = {
        electronics: {
            heading: 'Electronics Supply Chain',
            quote: '"GlobalFreight transformed our supply chain efficiency!" – CTO, TechCorp',
            description: 'We partnered with a global tech giant to streamline air freight logistics, delivering high-value electronics across 20 countries with zero delays.',
            results: [
                'Reduced delivery times by 30%',
                'Achieved 99.8% on-time delivery rate',
                'Integrated real-time tracking for full visibility'
            ],
            industries: [
                'Electronics',
                'Technology',
                'Retail'
            ]
        },
        pharma: {
            heading: 'Pharmaceutical Logistics',
            quote: '"Their cold-chain expertise saved us millions!" – VP Operations, PharmaCo',
            description: 'Our cold-chain logistics ensured timely delivery of temperature-sensitive vaccines, navigating complex customs regulations across multiple regions.',
            results: [
                'Saved $500K in customs delay costs',
                'Maintained 100% temperature compliance',
                'Delivered to 15 countries in 48 hours'
            ],
            industries: [
                'Pharmaceuticals',
                'Healthcare',
                'Biotechnology'
            ]
        },
        automotive: {
            heading: 'Automotive Parts Delivery',
            quote: '"Just-in-time delivery that keeps our plants running!" – Supply Chain Manager, AutoCorp',
            description: 'We optimized multi-modal transport for an automotive manufacturer, enabling just-in-time delivery of critical parts to assembly plants worldwide.',
            results: [
                'Increased production efficiency by 25%',
                'Reduced logistics costs by 15%',
                'Supported 10 global assembly plants'
            ],
            industries: [
                'Automotive',
                'Manufacturing',
                'Supply Chain'
            ]
        }
    };

    successButtons.forEach(button => {
        button.addEventListener('click', () => {
            const caseId = button.getAttribute('data-case');
            const data = successData[caseId];
            if (!data) return;

            successModalHeading.textContent = data.heading;
            successModalQuote.textContent = data.quote;
            successModalDescription.textContent = data.description;
            successModalResults.innerHTML = data.results.map(r => `<li>${r}</li>`).join('');
            successModalIndustries.innerHTML = data.industries.map(i => `<li>${i}</li>`).join('');
            successModal.classList.remove('hidden');
            successModal.setAttribute('aria-hidden', 'false');
            successModal.querySelector('.modal-content')?.focus();
        });
    });

    successModalClose?.addEventListener('click', () => {
        successModal.classList.add('hidden');
        successModal.setAttribute('aria-hidden', 'true');
    });

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!serviceModal.classList.contains('hidden')) {
                serviceModal.classList.add('hidden');
                serviceModal.setAttribute('aria-hidden', 'true');
            }
            if (!successModal.classList.contains('hidden')) {
                successModal.classList.add('hidden');
                successModal.setAttribute('aria-hidden', 'true');
            }
        }
    });

    // Form submissions
    window.submitQuote = () => {
        const form = document.querySelector('#quote form');
        const error = document.getElementById('quote-error');
        if (form.checkValidity()) {
            error.classList.add('hidden');
            alert('Quote submitted successfully!');
            form.reset();
        } else {
            error.classList.remove('hidden');
            error.classList.add('animate-shake');
            setTimeout(() => error.classList.remove('animate-shake'), 400);
            form.reportValidity();
        }
    };

    window.submitContact = () => {
        const form = document.querySelector('#contact form');
        const error = document.getElementById('contact-error');
        if (form.checkValidity()) {
            error.classList.add('hidden');
            alert('Message sent successfully!');
            form.reset();
        } else {
            error.classList.remove('hidden');
            error.classList.add('animate-shake');
            setTimeout(() => error.classList.remove('animate-shake'), 400);
            form.reportValidity();
        }
    };

    window.submitNewsletter = () => {
        const form = document.querySelector('footer form');
        const error = document.getElementById('newsletter-error');
        const email = document.getElementById('newsletter-email');
        if (email.checkValidity()) {
            error.classList.add('hidden');
            alert('Subscribed successfully!');
            form.reset();
        } else {
            error.classList.remove('hidden');
            error.classList.add('animate-shake');
            setTimeout(() => error.classList.remove('animate-shake'), 400);
            email.reportValidity();
        }
    };

    // Lazy-load animations
    const sections = ['about', 'why-globalfreight', 'quote', 'contact', 'footer'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId) || document.querySelector('footer');
        if (section) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const elements = section.querySelectorAll('h2, h3, p, .grid, a, img, ul, form');
                        elements.forEach((el, index) => {
                            el.classList.add('animate-fade-slide');
                            el.style.animationDelay = `${index * 0.1}s`;
                        });
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '0px 0px -100px 0px',
                threshold: 0.1
            });
            observer.observe(section);
        }
    });
});