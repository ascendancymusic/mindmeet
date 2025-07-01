import React from 'react';
import { X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-slate-700/50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-xl transition-all duration-200 text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="text-slate-300 space-y-6">
            <p className="text-sm text-slate-400">Last updated: {currentDate}</p>
            
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">1. Introduction</h3>
              <p>
                MindMeetar ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our mind mapping service ("Service"). 
                Please read this policy carefully to understand our practices regarding your personal data.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h3>
              
              <h4 className="text-lg font-medium text-white mb-2">Personal Information</h4>
              <div className="space-y-2 mb-4">
                <p>• <strong>Account Information:</strong> Name, username, email address, password (encrypted)</p>
                <p>• <strong>Profile Information:</strong> Avatar, bio, profile preferences</p>
                <p>• <strong>Contact Information:</strong> When you contact our support team</p>
              </div>

              <h4 className="text-lg font-medium text-white mb-2">Content Information</h4>
              <div className="space-y-2 mb-4">
                <p>• <strong>Mind Maps:</strong> Content, structure, and metadata of your mind maps</p>
                <p>• <strong>Chat Messages:</strong> Messages sent through our chat system</p>
                <p>• <strong>Shared Content:</strong> Files, images, and links you upload or share</p>
                <p>• <strong>Collaboration Data:</strong> Interactions with other users' content</p>
              </div>

              <h4 className="text-lg font-medium text-white mb-2">Technical Information</h4>
              <div className="space-y-2">
                <p>• <strong>Device Information:</strong> IP address, browser type, operating system</p>
                <p>• <strong>Usage Data:</strong> Pages visited, features used, time spent on Service</p>
                <p>• <strong>Cookies:</strong> Session cookies and preference cookies</p>
                <p>• <strong>Log Data:</strong> Server logs for security and performance monitoring</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h3>
              <div className="space-y-2">
                <p>• <strong>Service Provision:</strong> To provide, maintain, and improve our Service</p>
                <p>• <strong>Account Management:</strong> To create and manage your account</p>
                <p>• <strong>Communication:</strong> To send important updates, security alerts, and support messages</p>
                <p>• <strong>Collaboration:</strong> To enable sharing and collaboration features</p>
                <p>• <strong>Security:</strong> To protect against fraud, abuse, and security threats</p>
                <p>• <strong>Analytics:</strong> To understand usage patterns and improve user experience</p>
                <p>• <strong>Legal Compliance:</strong> To comply with applicable laws and regulations</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">4. Information Sharing and Disclosure</h3>
              
              <h4 className="text-lg font-medium text-white mb-2">We may share your information in the following situations:</h4>
              <div className="space-y-2">
                <p>• <strong>With Your Consent:</strong> When you explicitly agree to share information</p>
                <p>• <strong>Public Content:</strong> Content you choose to make public (public mind maps, profiles)</p>
                <p>• <strong>Collaboration:</strong> With users you collaborate with on shared mind maps</p>
                <p>• <strong>Service Providers:</strong> With trusted third-party service providers (hosting, analytics)</p>
                <p>• <strong>Legal Requirements:</strong> When required by law or to protect rights and safety</p>
                <p>• <strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</p>
              </div>

              <h4 className="text-lg font-medium text-white mb-2 mt-4">We do NOT:</h4>
              <div className="space-y-2">
                <p>• Sell your personal information to third parties</p>
                <p>• Share your private content without your permission</p>
                <p>• Use your content for advertising purposes</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">5. Third-Party Integrations</h3>
              <p>
                Our Service integrates with third-party platforms (Spotify, SoundCloud, Google services). When you use these integrations:
              </p>
              <div className="space-y-2 mt-2">
                <p>• You're subject to their respective privacy policies</p>
                <p>• We only access information necessary for the integration to function</p>
                <p>• You can revoke these permissions at any time through your account settings</p>
                <p>• We don't store your third-party credentials on our servers</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">6. Data Security</h3>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data:
              </p>
              <div className="space-y-2 mt-2">
                <p>• <strong>Encryption:</strong> Data in transit and at rest is encrypted</p>
                <p>• <strong>Access Controls:</strong> Limited access to personal data on a need-to-know basis</p>
                <p>• <strong>Regular Audits:</strong> Security assessments and vulnerability testing</p>
                <p>• <strong>Secure Infrastructure:</strong> Hosting with reputable, security-focused providers</p>
                <p>• <strong>Incident Response:</strong> Procedures for detecting and responding to security incidents</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">7. Data Retention</h3>
              <p>
                We retain your information only as long as necessary:
              </p>
              <div className="space-y-2 mt-2">
                <p>• <strong>Account Data:</strong> Until you delete your account or request deletion</p>
                <p>• <strong>Content:</strong> Until you delete the content or your account</p>
                <p>• <strong>Usage Data:</strong> Aggregated data may be retained for analytics purposes</p>
                <p>• <strong>Legal Requirements:</strong> Some data may be retained to comply with legal obligations</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">8. Your Rights and Choices</h3>
              <p>You have the following rights regarding your personal data:</p>
              <div className="space-y-2 mt-2">
                <p>• <strong>Access:</strong> Request a copy of your personal data</p>
                <p>• <strong>Correction:</strong> Update or correct inaccurate information</p>
                <p>• <strong>Deletion:</strong> Request deletion of your account and personal data</p>
                <p>• <strong>Portability:</strong> Request a copy of your data in a portable format</p>
                <p>• <strong>Objection:</strong> Object to certain processing of your data</p>
                <p>• <strong>Withdrawal:</strong> Withdraw consent where processing is based on consent</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">9. Children's Privacy</h3>
              <p>
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information 
                from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, 
                please contact us so we can delete such information.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">10. International Data Transfers</h3>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure that such transfers 
                are conducted in accordance with applicable data protection laws and that appropriate safeguards are in place.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">11. Cookies and Similar Technologies</h3>
              <p>
                We use cookies and similar technologies to:
              </p>
              <div className="space-y-2 mt-2">
                <p>• Maintain your session and keep you logged in</p>
                <p>• Remember your preferences and settings</p>
                <p>• Analyze usage patterns and improve our Service</p>
                <p>• Ensure security and prevent fraud</p>
              </div>
              <p className="mt-2">
                You can control cookies through your browser settings, though some features may not work properly if cookies are disabled.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">12. Changes to This Privacy Policy</h3>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the 
                new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy 
                periodically for any changes.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">13. Contact Us</h3>
              <p>
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>              <div className="mt-2">
                <p>Email: [Your Privacy Contact Email]</p>
                <p>Address: [Your Business Address]</p>
              </div>
            </section>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-700/50 bg-slate-900/95 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all duration-200 font-medium"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
};
