"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "Is the system difficult to set up?",
    answer:
      "Not at all! Our system is designed to be user-friendly and can be set up in minutes. We provide step-by-step guidance and support to ensure a smooth implementation process.",
  },
  {
    question: "What do students need to check in?",
    answer:
      "Students only need their unique QR code, which they receive after registration. The QR code can be saved on their smartphone or printed out for easy access during events.",
  },
  {
    question: "Can this be used for events other than assemblies?",
    answer:
      "Absolutely! Our system is versatile and can be used for any type of event including workshops, seminars, conferences, meetings, and any gathering that requires attendance tracking.",
  },
  {
    question: "How secure is the attendance data?",
    answer:
      "We take data security seriously. All attendance data is encrypted and stored securely. We comply with data protection regulations and provide role-based access controls to ensure only authorized personnel can view sensitive information.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Quick answers to common questions about the attendance platform.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:ring-opacity-50 rounded-xl"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg font-semibold text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
