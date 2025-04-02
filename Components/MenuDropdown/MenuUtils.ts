import { NextRouter } from 'next/router';
import { FormEvent } from 'react';

export const handleInputChange = async (e, setFormData, formData) => {
  const { name, value } = e.target;
  const newData = prevData => ({ ...prevData, [name]: value });
  console.log(newData);
  await setFormData(newData);
};

export const generateMailToLink = (formData: { title: any; message: any; }) => {
  const encodedEmail = 'ZWRlbnMuemFjQGdtYWlsLmNvbQ=='; // Base64 encoded email
  const email = atob(encodedEmail); // Decode at runtime
  const subject = encodeURIComponent(formData.title);
  const body = encodeURIComponent(formData.message);
  return `mailto:${email}?subject=${subject}&body=${body}`;
};

export const handleSubmit = async (e: FormEvent<HTMLFormElement>, isMobile: boolean, formData: {
  title: string;
  message: string;
}) => {
  e.preventDefault();
  const mailToLink = generateMailToLink(formData);
  if (isMobile) {
    // For mobile, just change the window location
    window.location.href = mailToLink;
  } else {
    window.open(mailToLink, '_blank', 'noopener,noreferrer');
  }
};

export const handleClick = (page: string, router: NextRouter) => {
  if (router.route === page) {
    return;
  }
  try {
    router.push(`/${page}`);
  } catch (error) {
    console.error(`Error fetching ${page} page. ${error}`);
  }
};