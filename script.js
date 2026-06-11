/**
 * DoubtHub Landing Page Interactions
 * Handles: Responsive menu toggle, scroll states, Intersection Observers, 
 * holographic card cursor tracking, and accessibility bindings.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initMobileMenu();
  initScrollAnimations();
  initHolographicCardGlow();
  initSmoothScrollKeyboardFix();
});

/**
 * 1. Navbar Scroll Effect
 * Toggles a compressed scrolled glass look when user scrolls down.
 */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  // Run on load and add listener
  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });
}

/**
 * 2. Mobile Hamburger Toggle & ARIA Controls
 */
function initMobileMenu() {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-item a');

  if (!navToggle || !navMenu) return;

  const toggleMenu = () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    
    // Toggle active classes
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
    
    // Update ARIA attributes
    navToggle.setAttribute('aria-expanded', !isExpanded);
    navMenu.setAttribute('aria-hidden', isExpanded);
    
    // Toggle scroll locking on body
    document.body.style.overflow = isExpanded ? '' : 'hidden';

    // Swap hamburger to close icon (using Lucide classes if applicable, or fallback text)
    const icon = navToggle.querySelector('i');
    if (icon) {
      if (isExpanded) {
        icon.setAttribute('data-lucide', 'menu');
      } else {
        icon.setAttribute('data-lucide', 'x');
      }
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  };

  navToggle.addEventListener('click', toggleMenu);

  // Close menu when clicking a link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu.classList.contains('active')) {
        toggleMenu();
      }
    });
  });

  // Handle escape key to close menu
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
      toggleMenu();
      navToggle.focus();
    }
  });
}

/**
 * 3. Intersection Observer Scroll Reveal Animations
 */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal-fade-up');

  if (revealElements.length === 0) return;

  // Configuration
  const observerOptions = {
    root: null, // viewport
    rootMargin: '0px 0px -80px 0px', // Trigger slightly before screen bottom
    threshold: 0.1 // 10% element visible
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Unobserve once shown for performance
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(element => {
    observer.observe(element);
  });
}

/**
 * 4. Holographic Cursor Glow Cards
 * Updates custom CSS variables --mouse-x and --mouse-y representing
 * coordinates inside the bounding box of each card wrapper.
 */
function initHolographicCardGlow() {
  const cards = document.querySelectorAll('.card-glow-wrapper');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

/**
 * 5. Smooth Scroll Keyboard Focus Fix
 * Ensures keyboard tab focus flows nicely when navigating via screen links.
 */
function initSmoothScrollKeyboardFix() {
  const anchors = document.querySelectorAll('a[href^="#"]');

  anchors.forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        
        // Update focus state for keyboard/screenreaders
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        
        // Remove outline index once focused out to preserve visual design
        target.addEventListener('blur', function blurHandler() {
          target.removeAttribute('tabindex');
          target.removeEventListener('blur', blurHandler);
        });
      }
    });
  });
}
