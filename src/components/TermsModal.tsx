import React from 'react';
import { X } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Terms of Service</h2>
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
              <h3 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h3>
              <p>
                By accessing and using MindMeetar ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">2. Description of Service</h3>
              <p>
                MindMeetar is a web-based mind mapping and collaboration platform that allows users to create, share, and collaborate on visual mind maps. 
                The Service includes features such as real-time collaboration, chat functionality, multimedia content integration, and social sharing capabilities.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">3. User Accounts</h3>
              <div className="space-y-2">
                <p>• You must provide accurate and complete information when creating an account</p>
                <p>• You are responsible for maintaining the confidentiality of your account credentials</p>
                <p>• You are responsible for all activities that occur under your account</p>
                <p>• You must notify us immediately of any unauthorized use of your account</p>
                <p>• We reserve the right to suspend or terminate accounts that violate these terms</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">4. User Content and Conduct</h3>
              <div className="space-y-2">
                <p><strong>You agree not to:</strong></p>
                <p>• Upload, post, or share content that is illegal, harmful, threatening, abusive, or offensive</p>
                <p>• Violate any intellectual property rights of others</p>
                <p>• Share personal information of others without their consent</p>
                <p>• Use the Service for spam, malware distribution, or other malicious activities</p>
                <p>• Attempt to gain unauthorized access to other user accounts or system resources</p>
                <p>• Interfere with or disrupt the Service or servers</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">5. Intellectual Property</h3>
              <p>
                You retain ownership of content you create and upload to MindMeetar. By using the Service, you grant us a worldwide, 
                non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content solely for the purpose of 
                providing and improving the Service. We respect intellectual property rights and will respond to valid DMCA takedown requests.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">6. Privacy and Data</h3>
              <p>
                Your privacy is important to us. Our data collection and use practices are detailed in our Privacy Policy, 
                which is incorporated into these Terms by reference. By using the Service, you consent to our Privacy Policy.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">7. Third-Party Integrations</h3>
              <p>
                MindMeetar may integrate with third-party services (such as Spotify, SoundCloud, Google services). 
                Your use of these integrations is subject to the respective third-party terms of service and privacy policies. 
                We are not responsible for third-party services or their content.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">8. Service Availability</h3>
              <p>
                We strive to maintain high availability but do not guarantee uninterrupted access to the Service. 
                We may temporarily suspend the Service for maintenance, updates, or due to factors beyond our control. 
                We reserve the right to modify or discontinue the Service at any time.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">9. Limitation of Liability</h3>
              <p>
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, 
                WE DISCLAIM ALL WARRANTIES AND SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, 
                OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">10. Indemnification</h3>
              <p>
                You agree to indemnify and hold harmless MindMeetar and its affiliates from any claims, damages, losses, 
                or expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">11. Termination</h3>
              <p>
                Either party may terminate this agreement at any time. Upon termination, your right to use the Service will cease immediately. 
                We may delete your account and data following termination, subject to our data retention policies.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">12. Governing Law</h3>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
                without regard to conflict of law principles. Any disputes shall be resolved in the courts of [Your Jurisdiction].
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">13. Changes to Terms</h3>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of significant changes through 
                the Service or by email. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3">14. Contact Information</h3>
              <p>
                If you have questions about these Terms, please contact us at: [Your Contact Email]
              </p>
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
