import { LightningElement, track, wire, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getDashboardData from '@salesforce/apex/DashboardController.getDashboardData';
import getUserSkills from '@salesforce/apex/ProfileController.getUserSkills';
import removeSkillFromProfile from '@salesforce/apex/ProfileController.removeSkillFromProfile';
import updateUserProfile from '@salesforce/apex/ProfileController.updateUserProfile';
import updateUserSettings from '@salesforce/apex/ProfileController.updateUserSettings';
import addSkillToProfile from '@salesforce/apex/ProfileController.addSkillToProfile';
import getSkillsCatalog from '@salesforce/apex/ProfileController.getSkillsCatalog';
import updateSkillInProfile from '@salesforce/apex/ProfileController.updateSkillInProfile';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ProfileDashboard extends LightningElement {
    @track isLoading = true;
    @track currentWeekStart = '';

    @track profile = { 
        name: '', 
        title: '', 
        department: '', 
        email: '', 
        joinDate: '', 
        totalHours: 0,
        phone: 'Not Specified',
        location: 'Not Specified',
        city: '',
        state: '',
        managerName: 'None',
        timezone: 'GMT-08:00 (Pacific Standard Time)',
        locale: 'English (United States)',
        tenure: '0y',
        utilizationRate: 0,
        weeklyHoursTarget: 40,
        notificationPreferences: 'All',
        productivityTarget: 80
    };
    @track skills = [];
    @track activeProjects = [];

    // Wired Reference for refreshApex
    wiredSkillsResult;
    wiredDashboardResult;

    // Modal Control Properties
    @track isSkillModalOpen = false;
    @track isContactModalOpen = false;
    @track isSettingsModalOpen = false;
    @track isSavingSkill = false;
    @track isSavingContact = false;
    @track isSavingSettings = false;

    // Add Skill Input Mappings
    @track catalogSkills = [];
    @track newSkillId = '';
    @track newSkillCategory = '';
    @track newSkillProficiency = '';
    @track newSkillExperience = 1;
    @track newSkillCertified = false;

    // Edit Skill Input Mappings
    @track isEditSkillModalOpen = false;
    @track editSkillRecordId = '';
    @track editSkillName = '';
    @track editSkillCategory = '';
    @track editSkillProficiency = '';
    @track editSkillExperience = 1;
    @track editSkillCertified = false;

    // Edit Contact Input Mappings
    @track editEmail = '';
    @track editPhone = '';
    @track editCity = '';
    @track editState = '';

    // Edit Settings Input Mappings
    @track editTimezone = '';
    @track editLocale = '';
    @track editWeeklyHoursTarget = 40;
    @track editNotificationPreferences = 'All';

    // LWR Toast Properties
    @track toastTitle = '';
    @track toastMessage = '';
    @track toastVariant = 'success';

    get mondayDateStr() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    connectedCallback() {
        this.currentWeekStart = this.mondayDateStr;
        console.log('[ProfileDashboard] connectedCallback active. currentWeekStart:', this.currentWeekStart);
    }

    // Consolidated Cacheable Wire Architecture
    @wire(getDashboardData, { weekStart: '$currentWeekStart' })
    wiredDashboard(result) {
        this.wiredDashboardResult = result;
        const { error, data } = result;
        if (data) {
            console.log('[ProfileDashboard] Deployed dynamic DTO profile mappings retrieved successfully.');
            
            // Map Profile Info
            if (data.profile) {
                this.profile = {
                    name: data.profile.name || '',
                    title: data.profile.title || 'Senior Consultant',
                    department: data.profile.department || 'Technology',
                    email: data.profile.email || '',
                    joinDate: data.profile.joinDate || 'N/A',
                    totalHours: parseFloat(data.kpis ? data.kpis.totalHours : 0),
                    phone: data.profile.phone || 'Not Specified',
                    location: data.profile.location || 'Not Specified',
                    city: data.profile.city || '',
                    state: data.profile.state || '',
                    managerName: data.profile.managerName || 'None',
                    timezone: data.profile.timezone || 'GMT-08:00 (Pacific Standard Time)',
                    locale: data.profile.locale || 'English (United States)',
                    tenure: data.profile.tenure || '0y',
                    utilizationRate: data.kpis ? data.kpis.utilizationRate : 0,
                    weeklyHoursTarget: data.profile.weeklyHoursTarget || 40,
                    notificationPreferences: data.profile.notificationPreferences || 'All',
                    productivityTarget: data.profile.productivityTarget || 80
                };
            }

            // Map active projects dynamically with real metrics instead of mocks!
            this.activeProjects = (data.activeProjects || []).map((p, index) => {
                const colors = ['#0b5ed7', '#34d058', '#f59e0b', '#7e3af2'];
                const progressPct = p.budgetHours > 0 ? Math.min(Math.round((p.loggedHours / p.budgetHours) * 100), 100) : 0;
                
                return {
                    id: p.id,
                    name: p.name || 'General Project',
                    dotStyle: `background: ${colors[index % colors.length]};`,
                    fillStyle: `width: ${progressPct}%; background: ${colors[index % colors.length]};`,
                    progress: progressPct
                };
            });

            this.isLoading = false;
        } else if (error) {
            console.error('[ProfileDashboard] Error loading wired DTO profile metrics:', error);
            this.isLoading = false;
        }
    }

    // Cacheable Wire for Skills to support seamless refreshApex
    @wire(getUserSkills)
    wiredSkills(result) {
        this.wiredSkillsResult = result;
        const { error, data } = result;
        if (data) {
            console.log('[ProfileDashboard] Wired skills loaded successfully:', data.length);
            this.skills = data.map(s => {
                return {
                    id: s.id,
                    name: s.name || 'Apex',
                    category: s.category || 'Technical',
                    proficiencyLevel: s.proficiencyLevel || 'Advanced',
                    yearsExperience: parseFloat(s.yearsExperience || 0),
                    certified: s.certified || false
                };
            });
        } else if (error) {
            console.error('[ProfileDashboard] Error loading wired user skills:', error);
        }
    }

    get userInitials() {
        if (!this.profile || !this.profile.name) return 'EM';
        const parts = this.profile.name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    get skillsCount() {
        return this.skills ? this.skills.length : 0;
    }

    get certifications() {
        if (!this.skills) return [];
        return this.skills
            .filter(s => s.certified)
            .map(s => {
                return {
                    id: s.id,
                    initials: s.name ? s.name.substring(0, 2).toUpperCase() : 'CRT',
                    name: s.name + ' Certification',
                    date: `Proficiency: ${s.proficiencyLevel} (${s.yearsExperience} yrs exp)`
                };
            });
    }

    get hasCertifications() {
        return this.certifications && this.certifications.length > 0;
    }

    get hasActiveProjects() {
        return this.activeProjects && this.activeProjects.length > 0;
    }

    get utilizationRateFormatted() {
        return (this.profile && this.profile.utilizationRate !== undefined) ? this.profile.utilizationRate + '%' : '0%';
    }

    get employeeCode() {
        return 'EMP-' + (this.profile.name ? this.profile.name.length * 123 + 4938 : 49382);
    }

    /**
     * Imperative deletion handler to remove the skill record from Salesforce!
     */
    async handleSkillDelete(event) {
        const deletedId = event.detail.id;
        console.log('[ProfileDashboard] Initiating delete for employee skill ID:', deletedId);
        
        this.isLoading = true;
        try {
            await removeSkillFromProfile({ employeeSkillId: deletedId });
            console.log('[ProfileDashboard] Apex removeSkillFromProfile succeeded. Refreshing skills wire...');
            
            // Refresh wired skills cache reactively
            await refreshApex(this.wiredSkillsResult);
        } catch (error) {
            console.error('[ProfileDashboard] Error deleting skill record:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Refresh skills from outer components (e.g. addition modal)
    @api
    async refreshSkills() {
        console.log('[ProfileDashboard] refreshSkills API method called.');
        await refreshApex(this.wiredSkillsResult);
    }

    // Wire skills catalog dynamically
    @wire(getSkillsCatalog)
    wiredCatalogSkills({ error, data }) {
        if (data) {
            this.catalogSkills = data;
        } else if (error) {
            console.error('[ProfileDashboard] Error retrieving skills catalog:', error);
        }
    }

    get skillCatalogOptions() {
        if (!this.catalogSkills) return [];
        return this.catalogSkills.map(s => {
            return { label: s.Name, value: s.Id };
        });
    }

    get proficiencyOptions() {
        return [
            { label: 'Beginner', value: 'Beginner' },
            { label: 'Intermediate', value: 'Intermediate' },
            { label: 'Advanced', value: 'Advanced' },
            { label: 'Expert', value: 'Expert' }
        ];
    }

    get timezoneOptions() {
        return [
            { label: 'Pacific Standard Time (America/Los_Angeles)', value: 'America/Los_Angeles' },
            { label: 'Mountain Standard Time (America/Denver)', value: 'America/Denver' },
            { label: 'Central Standard Time (America/Chicago)', value: 'America/Chicago' },
            { label: 'Eastern Standard Time (America/New_York)', value: 'America/New_York' },
            { label: 'Greenwich Mean Time (GMT)', value: 'GMT' },
            { label: 'British Summer Time (Europe/London)', value: 'Europe/London' },
            { label: 'India Standard Time (Asia/Kolkata)', value: 'Asia/Kolkata' },
            { label: 'Japan Standard Time (Asia/Tokyo)', value: 'Asia/Tokyo' }
        ];
    }

    get localeOptions() {
        return [
            { label: 'English (United States) - en_US', value: 'en_US' },
            { label: 'English (United Kingdom) - en_GB', value: 'en_GB' },
            { label: 'German (Germany) - de_DE', value: 'de_DE' },
            { label: 'French (France) - fr_FR', value: 'fr_FR' },
            { label: 'Spanish (Spain) - es_ES', value: 'es_ES' },
            { label: 'Japanese (Japan) - ja_JP', value: 'ja_JP' }
        ];
    }

    get notificationOptions() {
        return [
            { label: 'All notifications (Email + In-App)', value: 'All' },
            { label: 'Email only', value: 'Email Only' },
            { label: 'In-App only', value: 'In-App Only' },
            { label: 'None', value: 'None' }
        ];
    }

    // Modal Control Actions
    handleOpenSkillModal() {
        this.newSkillId = '';
        this.newSkillCategory = '';
        this.newSkillProficiency = '';
        this.newSkillExperience = 1;
        this.newSkillCertified = false;
        this.isSkillModalOpen = true;
    }

    handleCloseSkillModal() {
        this.isSkillModalOpen = false;
    }

    handleOpenEditSkillModal(event) {
        const skill = event.detail.skill;
        console.log('[ProfileDashboard] Opening edit modal for skill:', JSON.stringify(skill));
        this.editSkillRecordId = skill.id;
        this.editSkillName = skill.name;
        this.editSkillCategory = skill.category;
        this.editSkillProficiency = skill.proficiencyLevel;
        this.editSkillExperience = skill.yearsExperience;
        this.editSkillCertified = skill.certified;
        this.isEditSkillModalOpen = true;
    }

    handleCloseEditSkillModal() {
        this.isEditSkillModalOpen = false;
    }

    handleEditContact() {
        this.editEmail = this.profile.email;
        this.editPhone = this.profile.phone === 'Not Specified' ? '' : this.profile.phone;
        this.editCity = this.profile.city;
        this.editState = this.profile.state;
        this.isContactModalOpen = true;
    }

    handleCloseContactModal() {
        this.isContactModalOpen = false;
    }

    handleEditSettings() {
        this.editTimezone = this.profile.timezone;
        this.editLocale = this.profile.locale;
        this.editWeeklyHoursTarget = this.profile.weeklyHoursTarget;
        this.editNotificationPreferences = this.profile.notificationPreferences;
        this.isSettingsModalOpen = true;
    }

    handleCloseSettingsModal() {
        this.isSettingsModalOpen = false;
    }

    // Modal Input Value Handlers
    handleSkillCatalogChange(event) {
        this.newSkillId = event.detail.value;
        const selected = this.catalogSkills.find(s => s.Id === this.newSkillId);
        this.newSkillCategory = selected ? selected.Category__c : 'Technical';
    }

    handleProficiencyChange(event) {
        this.newSkillProficiency = event.detail.value;
    }

    handleExperienceChange(event) {
        this.newSkillExperience = event.detail.value;
    }

    handleCertifiedChange(event) {
        this.newSkillCertified = event.target.checked;
    }

    handleEditProficiencyChange(event) {
        this.editSkillProficiency = event.detail.value;
    }

    handleEditExperienceChange(event) {
        this.editSkillExperience = event.detail.value;
    }

    handleEditCertifiedChange(event) {
        this.editSkillCertified = event.target.checked;
    }

    handleContactFieldChange(event) {
        const field = event.target.dataset.field;
        if (field === 'email') this.editEmail = event.target.value;
        else if (field === 'phone') this.editPhone = event.target.value;
        else if (field === 'city') this.editCity = event.target.value;
        else if (field === 'state') this.editState = event.target.value;
    }

    handleSettingsFieldChange(event) {
        const field = event.target.dataset.field;
        if (field === 'timezone') this.editTimezone = event.target.value;
        else if (field === 'locale') this.editLocale = event.target.value;
        else if (field === 'weeklyHoursTarget') this.editWeeklyHoursTarget = event.target.value;
        else if (field === 'notificationPreferences') this.editNotificationPreferences = event.target.value;
    }

    // Apex Save Mutations
    async handleSaveSkill() {
        const allValid = [...this.template.querySelectorAll('lightning-combobox, lightning-input')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (!allValid) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Validation Error',
                    message: 'Please fill in all required fields correctly.',
                    variant: 'error'
                })
            );
            return;
        }

        this.isSavingSkill = true;
        this.isLoading = true;
        try {
            await addSkillToProfile({
                skillId: this.newSkillId,
                proficiency: this.newSkillProficiency,
                experience: parseFloat(this.newSkillExperience),
                certified: this.newSkillCertified
            });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Skill Added',
                    message: 'Skill added to profile successfully.',
                    variant: 'success'
                })
            );
            this.showToast('Skill Added', 'Skill added to profile successfully.', 'success');

            this.handleCloseSkillModal();
            await refreshApex(this.wiredSkillsResult);
        } catch (error) {
            console.error('[ProfileDashboard] Error registering skill:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Registering Skill',
                    message: error.body ? error.body.message : 'An unknown error occurred.',
                    variant: 'error'
                })
            );
            this.showToast('Error Registering Skill', error.body ? error.body.message : 'An unknown error occurred.', 'error');
        } finally {
            this.isSavingSkill = false;
            this.isLoading = false;
        }
    }

    async handleSaveEditSkill() {
        const allValid = [...this.template.querySelectorAll('lightning-combobox, lightning-input')]
            .filter(inputCmp => inputCmp.name === 'editProficiency' || inputCmp.label === 'Years of Experience' || inputCmp.name === 'editSkillName')
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (!allValid) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Validation Error',
                    message: 'Please fill in all required fields correctly.',
                    variant: 'error'
                })
            );
            return;
        }

        this.isSavingSkill = true;
        this.isLoading = true;
        try {
            await updateSkillInProfile({
                employeeSkillId: this.editSkillRecordId,
                proficiency: this.editSkillProficiency,
                experience: parseFloat(this.editSkillExperience),
                certified: this.editSkillCertified
            });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Skill Updated',
                    message: 'Skill updated successfully.',
                    variant: 'success'
                })
            );
            this.showToast('Skill Updated', 'Skill updated successfully.', 'success');

            this.handleCloseEditSkillModal();
            await refreshApex(this.wiredSkillsResult);
        } catch (error) {
            console.error('[ProfileDashboard] Error updating skill:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Updating Skill',
                    message: error.body ? error.body.message : 'An unknown error occurred.',
                    variant: 'error'
                })
            );
            this.showToast('Error Updating Skill', error.body ? error.body.message : 'An unknown error occurred.', 'error');
        } finally {
            this.isSavingSkill = false;
            this.isLoading = false;
        }
    }

    async handleSaveContact() {
        const allValid = [...this.template.querySelectorAll('lightning-input')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (!allValid) return;

        this.isSavingContact = true;
        this.isLoading = true;
        try {
            await updateUserProfile({
                email: this.editEmail,
                phone: this.editPhone,
                city: this.editCity,
                state: this.editState
            });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Contact Information Updated',
                    message: 'Contact information saved successfully.',
                    variant: 'success'
                })
            );
            this.showToast('Contact Information Updated', 'Contact information saved successfully.', 'success');

            this.isContactModalOpen = false;
            await refreshApex(this.wiredDashboardResult);
        } catch (error) {
            console.error('[ProfileDashboard] Error updating profile details:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Updating Contact',
                    message: error.body ? error.body.message : 'An unknown error occurred.',
                    variant: 'error'
                })
            );
            this.showToast('Error Updating Contact', error.body ? error.body.message : 'An unknown error occurred.', 'error');
        } finally {
            this.isSavingContact = false;
            this.isLoading = false;
        }
    }

    async handleSaveSettings() {
        const allValid = [...this.template.querySelectorAll('lightning-combobox, lightning-input')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (!allValid) return;

        this.isSavingSettings = true;
        this.isLoading = true;
        try {
            await updateUserSettings({
                timezone: this.editTimezone,
                locale: this.editLocale,
                weeklyHoursTarget: parseFloat(this.editWeeklyHoursTarget),
                notificationPreferences: this.editNotificationPreferences
            });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Account Settings Updated',
                    message: 'Account settings saved successfully.',
                    variant: 'success'
                })
            );
            this.showToast('Account Settings Updated', 'Account settings saved successfully.', 'success');

            this.isSettingsModalOpen = false;
            await refreshApex(this.wiredDashboardResult);
        } catch (error) {
            console.error('[ProfileDashboard] Error updating account settings:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Updating Settings',
                    message: error.body ? error.body.message : 'An unknown error occurred.',
                    variant: 'error'
                })
            );
            this.showToast('Error Updating Settings', error.body ? error.body.message : 'An unknown error occurred.', 'error');
        } finally {
            this.isSavingSettings = false;
            this.isLoading = false;
        }
    }

    showToast(title, message, variant = 'success') {
        this.toastTitle = title;
        this.toastMessage = message;
        this.toastVariant = variant;
        const toast = this.template.querySelector('c-toast-message');
        if (toast) {
            toast.show();
        }
    }
}