import { FormState } from '../types';
import { DEFAULT_FORM_STATE } from '../constants';

// Create sample data for "Create New Copy" mode
export const createSampleData = (): FormState => {
  return {
    ...DEFAULT_FORM_STATE,
    tab: 'create',
    language: 'Spanish',
    tone: 'Professional',
    wordCount: 'Medium: 100-200',
    competitorUrls: [
      'https://selfish.com.mx/',
      'https://www.adgoritmo.com/agencia-diseno-web/',
      'https://newemage.com.mx/'
    ],
    pageType: 'Homepage',
    businessDescription: 'Diseño y desarrollo de sitios web personalizados que te impulsan al éxito en un entorno digital lleno de desafíos y oportunidades. Un sitio web desarrollado a detalle en cada uno de los aspectos que lo define como excelente; tiene la capacidad de hacer crecer a tu negocio con un ritmo acelerado. Somos una agencia de diseño y desarrollo web con más de 15 años de experiencia.',
    targetAudience: 'Pequeñas y medianas empresas en México que buscan mejorar su presencia digital y atraer más clientes en línea.',
    keyMessage: 'Nuestro diseño web profesional aumentará tu visibilidad online y generará más ventas.',
    desiredEmotion: 'Confianza, Profesionalismo',
    callToAction: 'Solicita una consulta gratuita',
    brandValues: 'Innovación, Calidad, Experiencia',
    keywords: 'diseño web, desarrollo, profesional, personalizado',
    context: 'Mercado competitivo donde las empresas necesitan destacarse con sitios web de alta calidad',
    briefDescription: 'Página web para agencia de diseño web',
    model: 'gpt-4o',
    evaluateInputs: true,
    generateScore: true,
    generateHeadlines: true,
    isLoading: false,
    isEvaluating: false
  };
};

// Create sample data for "Improve Existing Copy" mode
export const improveSampleData = (): FormState => {
  return {
    ...DEFAULT_FORM_STATE,
    tab: 'improve',
    language: 'Spanish',
    tone: 'Professional',
    wordCount: 'Custom',
    customWordCount: 500,
    competitorUrls: [
      'https://selfish.com.mx/',
      'https://www.adgoritmo.com/agencia-diseno-web/',
      'https://newemage.com.mx/'
    ],
    originalCopy: 'Diseño y desarrollo de sitios web personalizados que te impulsan al éxito en un entorno digital lleno de desafíos y oportunidades. Un sitio web desarrollado a detalle en cada uno de los aspectos que lo define como excelente; tiene la capacidad de hacer crecer a tu negocio con un ritmo acelerado. Somos una agencia de diseño y desarrollo web con más de 15 años de experiencia.',
    targetAudience: 'Pequeñas y medianas empresas en México que buscan mejorar su presencia digital y atraer más clientes en línea.',
    keyMessage: 'Nuestro diseño web profesional aumentará tu visibilidad online y generará más ventas.',
    desiredEmotion: 'Confianza, Profesionalismo',
    callToAction: 'Solicita una consulta gratuita',
    brandValues: 'Innovación, Calidad, Experiencia',
    keywords: 'diseño web, desarrollo, profesional, personalizado',
    context: 'Mercado competitivo donde las empresas necesitan destacarse con sitios web de alta calidad',
    briefDescription: 'Mejora de texto para agencia de diseño web',
    model: 'gpt-4o',
    evaluateInputs: true,
    generateScore: true,
    generateHeadlines: true,
    isLoading: false,
    isEvaluating: false
  };
};