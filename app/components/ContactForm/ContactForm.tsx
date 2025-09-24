'use client';

import { useState } from 'react';

import styles from './ContactForm.module.scss';

interface FormData {
  title: string;
  message: string;
}

interface ContactFormProps {
  onBack: () => void;
  onSubmit: () => void;
}

/**
 * Contact Form Component
 *
 * Interactive contact form that generates mailto links with form data.
 * Handles responsive behavior for mobile vs desktop email client opening
 * and includes email obfuscation for spam protection.
 *
 * @dependencies
 * - React useState for form state management
 * - ContactForm.module.scss for component styling
 * - FormData interface for type safety
 *
 * @param props - Component props object containing:
 * @param props.onBack - Callback function to return to previous view (currently unused)
 * @param props.onSubmit - Callback function called after successful form submission
 * @returns Client component rendering contact form with mailto functionality
 */
export function ContactForm({ onBack: _onBack, onSubmit }: ContactFormProps) {
  const [formData, setFormData] = useState<FormData>({ title: '', message: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateMailToLink = (formData: FormData) => {
    const encodedEmail = 'ZWRlbnMuemFjQGdtYWlsLmNvbQ=='; // Base64 encoded email
    const email = atob(encodedEmail); // Decode at runtime
    const subject = encodeURIComponent(formData.title);
    const body = encodeURIComponent(formData.message);
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const mailToLink = generateMailToLink(formData);
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      window.location.href = mailToLink;
    } else {
      window.open(mailToLink, '_blank', 'noopener,noreferrer');
    }

    // Reset form and notify parent
    setFormData({ title: '', message: '' });
    onSubmit();
  };

  return (
    <div className={styles.contactFormContainer}>
      <div className={styles.formWrapper}>
        <form className={styles.contactForm} onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            placeholder="Title"
            className={styles.titleInput}
            value={formData.title}
            onChange={handleInputChange}
            required
          />
          <textarea
            placeholder="Your message"
            name="message"
            className={styles.messageTextarea}
            value={formData.message}
            onChange={handleInputChange}
            required
          />
          <button type="submit" className={styles.submitButton}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}