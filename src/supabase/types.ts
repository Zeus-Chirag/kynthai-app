export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'patient' | 'doctor' | 'lab' | 'admin' | 'caretaker';
          phone: string | null;
          date_of_birth: string | null;
          emergency_contact_1: string | null;
          emergency_contact_2: string | null;
          data_processing_consent: boolean;
          terms_of_service_consent: boolean;
          hipaa_consent: boolean;
          ai_training_consent: boolean;
          verified: boolean;
          registered_at: string;
          created_at: string;
          updated_at: string;
          onboarding_complete: boolean;
          onboarding_role: string | null;
          language: string;
          alarm_enabled: boolean;
          alarm_mode: string;
          email_verification_token: string | null;
          email_verification_expires: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role: 'patient' | 'doctor' | 'lab' | 'admin' | 'caretaker';
          phone?: string | null;
          date_of_birth?: string | null;
          emergency_contact_1?: string | null;
          emergency_contact_2?: string | null;
          data_processing_consent?: boolean;
          terms_of_service_consent?: boolean;
          hipaa_consent?: boolean;
          ai_training_consent?: boolean;
          verified?: boolean;
          registered_at?: string;
          onboarding_complete?: boolean;
          onboarding_role?: string;
          language?: string;
          alarm_enabled?: boolean;
          alarm_mode?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'patient' | 'doctor' | 'lab' | 'admin' | 'caretaker';
          phone?: string | null;
          date_of_birth?: string | null;
          verified?: boolean;
          emergency_contact_1?: string | null;
          emergency_contact_2?: string | null;
          data_processing_consent?: boolean;
          terms_of_service_consent?: boolean;
          hipaa_consent?: boolean;
          ai_training_consent?: boolean;
          onboarding_complete?: boolean;
          onboarding_role?: string;
          language?: string;
          alarm_enabled?: boolean;
          alarm_mode?: string;
        };
      };
      doctor_profiles: {
        Row: {
          id: string;
          user_id: string;
          specialization: string;
          license_number: string;
          experience: number;
          consultation_fee: number;
          city: string;
          bio: string | null;
          video_call_enabled: boolean;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          specialization: string;
          license_number: string;
          experience?: number;
          consultation_fee: number;
          city: string;
          bio?: string | null;
          video_call_enabled?: boolean;
          verified?: boolean;
        };
        Update: {
          id?: string;
          specialization?: string;
          license_number?: string;
          experience?: number;
          consultation_fee?: number;
          city?: string;
          bio?: string | null;
          video_call_enabled?: boolean;
          verified?: boolean;
        };
      };
      lab_profiles: {
        Row: {
          id: string;
          user_id: string;
          lab_name: string;
          license_number: string;
          city: string;
          address: string | null;
          home_collection: boolean;
          status: 'pending' | 'active' | 'suspended';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lab_name: string;
          license_number: string;
          city: string;
          address?: string | null;
          home_collection?: boolean;
          status?: 'pending' | 'active' | 'suspended';
        };
        Update: {
          id?: string;
          lab_name?: string;
          license_number?: string;
          city?: string;
          address?: string | null;
          home_collection?: boolean;
          status?: 'pending' | 'active' | 'suspended';
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          scheduled_at: string;
          type: 'video' | 'in-person';
          price: number;
          commission: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          scheduled_at: string;
          type?: 'video' | 'in-person';
          price: number;
          commission?: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          commission?: number;
          notes?: string | null;
        };
      };
      lab_bookings: {
        Row: {
          id: string;
          patient_id: string;
          lab_id: string;
          lab_name: string;
          tests: string;
          price: number;
          commission: number;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          scheduled_at: string;
          home_collection: boolean;
          travel_fee: number | null;
          notes: string | null;
          results_file: string | null;
          results_note: string | null;
          result_uploaded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          lab_id: string;
          lab_name: string;
          tests: string;
          price: number;
          commission?: number;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          scheduled_at: string;
          home_collection: boolean;
          travel_fee?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          commission?: number;
          travel_fee?: number | null;
          notes?: string | null;
          results_file?: string | null;
          results_note?: string | null;
          result_uploaded_at?: string | null;
        };
      };
      medications: {
        Row: {
          id: string;
          patient_id: string;
          name: string;
          dosage: string;
          frequency: string;
          instructions: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          name: string;
          dosage: string;
          frequency: string;
          instructions?: string | null;
          color?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          dosage?: string;
          frequency?: string;
          instructions?: string | null;
          color?: string | null;
        };
      };
      prescriptions: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          medications: string;
          follow_up_date: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          medications: string;
          follow_up_date?: string | null;
          status?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          medications?: string;
          follow_up_date?: string | null;
          status?: string;
          notes?: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          type: string;
          status: string;
          provider: string;
          provider_ref: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency: string;
          type: string;
          status: string;
          provider: string;
          provider_ref?: string | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          status?: string;
          provider_ref?: string | null;
        };
      };
      refunds: {
        Row: {
          id: string;
          user_id: string;
          appointment_id: string | null;
          lab_booking_id: string | null;
          payment_id: string;
          amount: number;
          reason: string;
          status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
          requested_by: string;
          proof_file: string | null;
          proof_note: string | null;
          review_deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          appointment_id?: string | null;
          lab_booking_id?: string | null;
          payment_id: string;
          amount: number;
          reason: string;
          status?: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
          requested_by: string;
          proof_file?: string | null;
          proof_note?: string | null;
          review_deadline?: string | null;
        };
        Update: {
          id?: string;
          status?: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
          proof_file?: string | null;
          proof_note?: string | null;
        };
      };
      complaints: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          subject: string;
          description: string;
          priority: 'low' | 'medium' | 'high' | 'critical';
          status: 'open' | 'investigating' | 'resolved' | 'closed';
          related_entity_type: string | null;
          related_entity_id: string | null;
          proof_file: string | null;
          evidence_note: string | null;
          admin_response: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          subject: string;
          description: string;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          proof_file?: string | null;
          evidence_note?: string | null;
        };
        Update: {
          id?: string;
          status?: 'open' | 'investigating' | 'resolved' | 'closed';
          admin_response?: string | null;
        };
      };
      family_members: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          relation: string;
          email: string | null;
          phone: string | null;
          age: number;
          adherence: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          relation: string;
          email?: string | null;
          phone?: string | null;
          age: number;
          adherence?: number;
        };
        Update: {
          id?: string;
          name?: string;
          relation?: string;
          email?: string | null;
          phone?: string | null;
          age?: number;
          adherence?: number;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          data: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          data?: string | null;
          read?: boolean;
        };
        Update: {
          id?: string;
          read?: boolean;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          category: string;
          details: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          category: string;
          details?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          details?: string | null;
        };
      };
      payouts: {
        Row: {
          id: string;
          user_id: string | null;
          doctor_id: string | null;
          lab_id: string | null;
          appointment_id: string | null;
          lab_booking_id: string | null;
          amount: number;
          platform_fee: number;
          net_amount: number;
          currency: string;
          commission: number;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          paid_at: string | null;
          period_start: string;
          period_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          doctor_id?: string | null;
          lab_id?: string | null;
          appointment_id?: string | null;
          lab_booking_id?: string | null;
          amount: number;
          platform_fee?: number;
          net_amount?: number;
          currency: string;
          commission: number;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          period_start: string;
          period_end: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          paid_at?: string | null;
        };
      };
      lab_tests: {
        Row: {
          id: string;
          lab_id: string;
          name: string;
          price: number;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lab_id: string;
          name: string;
          price: number;
          category?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          category?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'patient' | 'doctor' | 'lab' | 'admin' | 'caretaker';
      appointment_status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
      refund_status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
      complaint_priority: 'low' | 'medium' | 'high' | 'critical';
      complaint_status: 'open' | 'investigating' | 'resolved' | 'closed';
      payout_status: 'pending' | 'processing' | 'completed' | 'failed';
    };
  };
};
