<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}


if(!class_exists("LocoAutomaticTranslateAddonPro")) {
	class LocoAutomaticTranslateAddonPro {
        public $plugin_file=__FILE__;
        public $responseObj;
        public $licenseMessage;
        public $showMessage=false;
        public $slug="loco-atlt-register";
        function __construct() {
    	    add_action( 'admin_print_styles', [ $this, 'SetAdminStyle' ] );
    	    $licenseKey=get_option("LocoAutomaticTranslateAddonPro_lic_Key","");
    	    $liceEmail=get_option( "LocoAutomaticTranslateAddonPro_lic_email","");
            LocoAutomaticTranslateAddonProBase::addOnDelete(function(){
               delete_option("LocoAutomaticTranslateAddonPro_lic_Key");
            });
    	    if(LocoAutomaticTranslateAddonProBase::CheckWPPlugin($licenseKey,$liceEmail,$this->licenseMessage,$this->responseObj,__FILE__)){
    		    add_action( 'admin_menu', [$this,'ActiveAdminMenu'],101);
    		    add_action( 'admin_post_LocoAutomaticTranslateAddonPro_el_deactivate_license', [ $this, 'action_deactivate_license' ] );
    		    //$this->licenselMessage=$this->mess;
                add_action('wp_ajax_loco_install_pro', array($this, 'loco_install_pro'));           

    	    }else{
    	        if(!empty($licenseKey) && !empty($this->licenseMessage)){
    	           $this->showMessage=true;
                }
                
    		    update_option("LocoAutomaticTranslateAddonPro_lic_Key","") || add_option("LocoAutomaticTranslateAddonPro_lic_Key","");
    		    add_action( 'admin_post_LocoAutomaticTranslateAddonPro_el_activate_license', [ $this, 'action_activate_license' ] );
    		    add_action( 'admin_menu', [$this,'InactiveMenu'],101);
    	    }
        }
    	function SetAdminStyle() {
    		wp_register_style( "LocoAutomaticTranslateAddonProLic", plugins_url("style.css",$this->plugin_file),10);
    		wp_enqueue_style( "LocoAutomaticTranslateAddonProLic" );
        }
        function ActiveAdminMenu(){
                add_submenu_page( 'loco',
                'Loco Automatic Translate Addon Pro', 
                'Auto Translate Settings',
                 'manage_options', 
                    $this->slug,
                 array($this, 'Activated'));

                 if( class_exists( 'LocoAutoTranslateAddonPro' ) ){
                     // no further execution required
                     return;
                 }
           
        }
        function InactiveMenu() {
            add_submenu_page( 'loco',
            'Loco Automatic Translate Addon Pro', 
            'Auto Translate Settings',
             'activate_plugins', 
             $this->slug,
             array($this, 'LicenseForm'));
    	  /*  add_menu_page( "LocoAutomaticTranslateAddonPro", "Loco Automatic Translate Addon Pro", 'activate_plugins', $this->slug,  [$this,"LicenseForm"], " dashicons-star-filled " ); */

        }
        function action_activate_license(){
        		check_admin_referer( 'el-license' );
        		$licenseKey=!empty($_POST['el_license_key'])?$_POST['el_license_key']:"";
        		$licenseEmail=!empty($_POST['el_license_email'])?$_POST['el_license_email']:"";
        		update_option("LocoAutomaticTranslateAddonPro_lic_Key",$licenseKey) || add_option("LocoAutomaticTranslateAddonPro_lic_Key",$licenseKey);
        		update_option("LocoAutomaticTranslateAddonPro_lic_email",$licenseEmail) || add_option("LocoAutomaticTranslateAddonPro_lic_email",$licenseEmail);
        		wp_safe_redirect(admin_url( 'admin.php?page='.$this->slug));
        	}
        function action_deactivate_license() {
    	    check_admin_referer( 'el-license' );
    	    if(LocoAutomaticTranslateAddonProBase::RemoveLicenseKey(__FILE__,$message)){
    		    update_option("LocoAutomaticTranslateAddonPro_lic_Key","") || add_option("LocoAutomaticTranslateAddonPro_lic_Key","");
    	    }
    	    wp_safe_redirect(admin_url( 'admin.php?page='.$this->slug));
        }


        function Activated() {
            $tab = isset($_GET['tab']) ? $_GET['tab'] : 'Registration'; // Default tab
        
            ?>
            <div class="wrap">
                <h1><?php esc_html_e('Automatic Translate For Loco Translate Settings', 'Translate-Addon-Settings'); ?></h1>
                <h2 class="nav-tab-wrapper">
                    <a href="?page=<?php echo esc_attr($this->slug); ?>&tab=Registration" class="nav-tab <?php echo $tab == 'Registration' ? 'nav-tab-active' : ''; ?>"><?php esc_html_e('Registration', 'Translate-Addon-Settings'); ?></a>
                    <a href="?page=<?php echo esc_attr($this->slug); ?>&tab=API-key" class="nav-tab <?php echo $tab == 'API-key' ? 'nav-tab-active' : ''; ?>"><?php esc_html_e('Settings', 'Translate-Addon-Settings'); ?></a>
                </h2>
                
                <?php
                switch ($tab) {
                    case 'Registration':
                        $this->activatedform_elements_tab_content();
                        break;
                    case 'API-key':
                        $this->activatedsettings_tab_content();
                        break;
                    default:
                        $this->activatedform_elements_tab_content();
                        break;
                }
                ?>
            </div>
            <?php
        }
        
        function activatedform_elements_tab_content() {
            ?>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <input type="hidden" name="action" value="LocoAutomaticTranslateAddonPro_el_deactivate_license"/>
                <div class="el-license-container">
                    <h3 class="el-license-title"><i class="dashicons-before dashicons-translation"></i> <?php _e("Automatic Translate Addon For Loco Translate - Premium License Status",$this->slug);?> </h3>
                    <div class="el-license-content">
                        <div class="el-license-form">
                            <h3>Active License Status</h3>
                            <ul class="el-license-info">
                            <li>
                                <div>
                                    <span class="el-license-info-title"><?php _e("License Status",$this->slug);?></span>

                                    <?php if ( $this->responseObj->is_valid ) : ?>
                                        <span class="el-license-valid"><?php _e("Valid",$this->slug);?></span>
                                    <?php else : ?>
                                        <span class="el-license-valid"><?php _e("Invalid",$this->slug);?></span>
                                    <?php endif; ?>
                                </div>
                            </li>

                            <li>
                                <div>
                                    <span class="el-license-info-title"><?php _e("License Type",$this->slug);?></span>
                                    <?php echo $this->responseObj->license_title; ?>
                                </div>
                            </li>

                            <li>
                                <div>
                                    <span class="el-license-info-title"><?php _e("License Expiry Date",$this->slug);?></span>
                                    <?php echo $this->responseObj->expire_date; ?>
                                </div>
                            </li>

                            <li>
                                <div>
                                    <span class="el-license-info-title"><?php _e("Support Expiry Date",$this->slug);?></span>
                                    <?php echo $this->responseObj->support_end; ?>
                                </div>
                            </li>
                                <li>
                                    <div>
                                        <span class="el-license-info-title"><?php _e("Your License Key",$this->slug);?></span>
                                        <span class="el-license-key"><?php echo esc_attr( substr($this->responseObj->license_key,0,9)."XXXXXXXX-XXXXXXXX".substr($this->responseObj->license_key,-9) ); ?></span>
                                    </div>
                                </li>
                            </ul>
                            <div class="el-license-active-btn">
                                <?php wp_nonce_field( 'el-license' ); ?>
                                <?php submit_button('Deactivate License'); ?>
                            </div>
                        </div>
                        <div class="el-license-textbox">
                        <h3>Important Points</h3>
                        <ol>
                            <li>Please deactivate your license first before moving your website or changing domain.</li>
                            <li>Plugin does not auto-translate any string that contains HTML and special characters.</li>
                            <li>Currently DeepL Doc Translator provides limited number of free docs translations per day. You can purchase to <a href="https://www.deepl.com/pro?cta=homepage-free-trial#pricing/" target="_blank">DeepL Pro</a> to increase this limit.</li>
                            <li>If you have any issue or you get stuck while using ChatGPT translation, please visit our <a href="https://locoaddon.com/docs/pro-plugin/ai-translation-issues-and-solutions/?utm_source=atlt_plugin&utm_medium=inside&utm_campaign=get_pro&utm_content=chatGPT_translation" target="_blank">documentation</a>.</li>
                            <li>If you have any issue or you get stuck while using Gemini AI translation, please visit our <a href="https://locoaddon.com/docs/pro-plugin/how-to-use-gemini-ai-to-translate-plugins-or-themes/?utm_source=atlt_plugin&utm_medium=inside&utm_campaign=get_pro&utm_content=geminiAI_translation" target="_blank">documentation</a>.</li>
                            <li>If you have any issue or query, please <a href="https://locoaddon.com/support/?utm_source=atlt_plugin&utm_medium=inside&utm_campaign=get_pro&utm_content=contact_support" target="_blank">contact support</a>.</li>
                        </ol>
                        <div class="el-pluginby">
                            Plugin by<br/>
                            <a href="https://coolplugins.net" target="_blank"><img src="<?php echo ATLT_PRO_URL.'/assets/images/coolplugins-logo.png' ?>"/></a>
                        </div>
                        </div>
                    </div>
                </div>
            </form>
    	<?php
        }

        function activatedsettings_tab_content() {
            $api_key_one = get_option('LocoAutomaticTranslateAddonPro_Genimi_api_key', '');
            
            if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['nonce'])) {
                // Verify nonce
                if (!wp_verify_nonce($_POST['nonce'], 'api_keys')) {
                    die('Security check failed');
                }
            
                // Check if update button is clicked
                if (isset($_POST['update_api_key'])) {
                    delete_option('LocoAutomaticTranslateAddonPro_Genimi_api_key');
                    $api_key_one = ''; // Reset the API key variable
                }
            
                // Check if save button is clicked
                if (isset($_POST['submit']) && isset($_POST['LocoAutomaticTranslateAddonPro_Genimi_api_key'])) {
                    $api_key_one = sanitize_text_field($_POST['LocoAutomaticTranslateAddonPro_Genimi_api_key']);
                    // Validate API key format with regex
                    $api_key_pattern = '/^AIza[0-9A-Za-z-_]{35}$/';
                    if (!preg_match($api_key_pattern, $api_key_one)) {
                        echo '<div class="notice notice-error is-dismissible"><p>' . esc_html__('Invalid API Key.', 'Translate-Addon-Settings') . '</p></div>';
                        $api_key_one = ''; // Reset the API key variable if not valid
                    } else {
                        // Attempt to verify API key by sending a test request
                        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' . $api_key_one;
                        
                        $headers = [
                            'Content-Type' => 'application/json'
                        ];
                        
                        $payload = array(
                            'contents' => array(
                                array(
                                    'parts' => array(
                                        array(
                                            'text' => 'Test'
                                        )
                                    )
                                )
                            )
                        );
                        
                        $response = wp_remote_post($url, [
                            'headers' => $headers,
                            'body' => json_encode($payload),
                            'method' => 'POST',
                            'data_format' => 'body',
                            'timeout' => 60,
                        ]);
                        
                        if (is_wp_error($response)) {
                            error_log('API call error: ' . $response->get_error_message());
                            echo '<div class="notice notice-error is-dismissible"><p>' . esc_html__('Invalid API Key.', 'Translate-Addon-Settings') . '</p></div>';
                            $api_key_one = ''; // Reset the API key variable if verification fails
                        } else {
                            $response_body = wp_remote_retrieve_body($response);
                            $response_data = json_decode($response_body, true);
                        
                            // Check for specific key/response to verify the API key
                            if (isset($response_data['error'])) {
                                echo '<div class="notice notice-error is-dismissible"><p>' . esc_html__('Invalid API Key.', 'Translate-Addon-Settings') . '</p></div>';
                                $api_key_one = ''; // Reset the API key variable if verification fails
                            } else {
                                update_option('LocoAutomaticTranslateAddonPro_Genimi_api_key', $api_key_one);
                                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('API Key saved.', 'Translate-Addon-Settings') . '</p></div>';
                            }
                        }
                    }
                }
            }
        
            // Output HTML content
            ?>
            <div class="el-license-container">
                <h3 class="el-license-title"><?php esc_html_e('Settings', 'Translate-Addon-Settings'); ?></h3>
                <div class="el-license-content">
                    <div class="el-license-form">
                        <?php if (!empty($api_key_one)) : ?>
                            <div>
                                <h3>Active API keys</h3>
                                <span class="el-license-info-title">Gemini API key</span>
                                <span class="el-license-key"><?php echo esc_html($api_key_one);?>     &#x2705</span>
                            </div>
                            <form method="post" action="">
                                <?php wp_nonce_field('api_keys', 'nonce'); ?>
                                <input type="hidden" name="update_api_key" value="true">
                                <p class="submit"><input type="submit" class="button button-primary" value="Update API Key"></p>
                            </form>
                        <?php else : ?>
                            <form method="post" action="" class="Translate-Addon-Settings-form" id="api-key-form">
                                <?php wp_nonce_field('api_keys', 'nonce'); ?>
                                <div class="el-license-field">
                                    <label for="api_key">Add Gemini API key</label>
                                    <input type="text" id="api_key" name="LocoAutomaticTranslateAddonPro_Genimi_api_key" value="<?php echo esc_attr($api_key_one); ?>" class="regular-text code" size="50" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" required="required">
                                    <p><a target="_blank" href="https://locoaddon.com/docs/pro-plugin/how-to-use-gemini-ai-to-translate-plugins-or-themes/generate-gemini-api-key/?utm_source=atlt_plugin&utm_medium=inside&utm_campaign=get_pro&utm_content=get_licenseKey">Click Here to See How to Generate Gemini API Key</a></p>
                                </div>
                                <div class="el-license-active-btn">
                                    <input type="hidden" name="_wp_http_referer" value="<?php echo esc_url($_SERVER['REQUEST_URI']); ?>">
                                    <p class="submit"><input type="submit" name="submit" id="submit" class="button button-primary" value="Save"></p>
                                </div>
                                <?php if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit'])) : ?>
                                    <?php if (!preg_match($api_key_pattern, $api_key_one)) : ?>
                                        <p class="notice notice-error is-dismissible"><?php esc_html_e('API key is not valid. Please enter valid API key', 'Translate-Addon-Settings'); ?></p>
                                    <?php endif; ?>
                                <?php endif; ?>
                            </form>
                        <?php endif; ?>
                    </div>
                    <div class="el-license-textbox">
                       <div class='el-license-geminiAPIkey'>
                            <h3>Rate Limits of Free Gemini API key</h3>
                            <ul>
                                <li><strong>15 RPM</strong> : This API Key allows a maximum of 15 requests per minute</li>
                                <li><strong>1 million TPM</strong> : With this API Key you can process up to 1 million tokens per minute</li>
                                <li><strong>1,500 RPD</strong> :  To ensure smooth performance, it allows up to 1,500 requests per day</li>
                            </ul>
                       </div>
                        <div class="el-pluginby ">
                            Plugin by<br>
                            <a href="https://coolplugins.net" target="_blank"><img src="<?php echo ATLT_PRO_URL.'/assets/images/coolplugins-logo.png' ?>"></a>
                        </div>
                    </div>
                </div>
            </div>   
            <?php               
        }
        
        

        function LicenseForm() {
            $tab = isset($_GET['tab']) ? $_GET['tab'] : 'Registration'; // Default tab
        
            ?>
            <div class="wrap">
                <h1><?php esc_html_e('Automatic Translate For Loco Translate Settings', 'Translate-Addon-Settings'); ?></h1>
                <h2 class="nav-tab-wrapper">
                    <a href="?page=<?php echo esc_attr($this->slug); ?>&tab=Registration" class="nav-tab <?php echo $tab == 'Registration' ? 'nav-tab-active' : ''; ?>"><?php esc_html_e('Registration', 'Translate-Addon-Settings'); ?></a>
                    <a href="?page=<?php echo esc_attr($this->slug); ?>&tab=API-key" class="nav-tab <?php echo $tab == 'API-key' ? 'nav-tab-active' : ''; ?>"><?php esc_html_e('Settings', 'Translate-Addon-Settings'); ?></a>
                </h2>
                
                <?php
                switch ($tab) {
                    case 'Registration':
                        $this->inactiveform_elements_tab_content();
                        break;
                    case 'API-key':
                        $this->inactivesettings_tab_content();
                        break;
                    default:
                        $this->inactiveform_elements_tab_content();
                        break;
                }
                ?>
            </div>
            <?php
        }

        function inactiveform_elements_tab_content() {
    	    ?>
        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
    	    <input type="hidden" name="action" value="LocoAutomaticTranslateAddonPro_el_activate_license"/>
    	    <div class="el-license-container">
    		    <h3 class="el-license-title"><i class="dashicons-before dashicons-translation"></i> <?php _e("Automatic Translate Addon For Loco Translate - Premium License",$this->slug);?></h3>
                <div class="el-license-content">
                    <div class="el-license-form">
                        <h3>Activate Premium License</h3>
                        <?php
                        if(!empty($this->showMessage) && !empty($this->licenseMessage)){
                            ?>
                            <div class="notice notice-error is-dismissible">
                                <p><?php echo _e($this->licenseMessage,$this->slug); ?></p>
                            </div>
                            <?php
                        }
                        ?>
                        <!--Enter License Key Here START-->
                        <div class="el-license-field">
                            <label for="el_license_key"><?php _e("Enter License code",$this->slug);?></label>
                            <input type="text" class="regular-text code" name="el_license_key" size="50" placeholder="xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx" required="required">
                        </div>
                        <div class="el-license-field">
                            <label for="el_license_key"><?php _e("Email Address",$this->slug);?></label>
                            <?php
                                $purchaseEmail   = get_option( "LocoAutomaticTranslateAddonPro_lic_email", get_bloginfo( 'admin_email' ));
                            ?>
                            <input type="text" class="regular-text code" name="el_license_email" size="50" value="<?php echo sanitize_email($purchaseEmail); ?>" placeholder="" required="required">
                            <div><small><?php _e("✅ I agree to share my purchase code and email for plugin verification and to receive future updates notifications!",$this->slug);?></small></div>
                        </div>
                        <div class="el-license-active-btn">
                            <?php wp_nonce_field( 'el-license' ); ?>
                            <?php submit_button('Activate'); ?>
                        </div>
                        <!--Enter License Key Here END-->
                    </div>
                    
                    <div class="el-license-textbox">
                        <div>
                        <strong style="color:#e00b0b;">*Important Points</strong>
                        <ol>
                        <li>Premium version supports <b>Google Translate</b> for better translations.</li>
                        <li>Automatic translate providers do not support HTML and special characters translations. So plugin will not automatic translate any string that contains HTML or special characters.</li>
                        <li>If any auto-translation provider stops any of its free translation service then plugin will not support that translation service provider.</li>
                        <li>DeepL Translate provides better translations than Google, Yandex or other machine translation providers. <a href="https://techcrunch.com/2017/08/29/deepl-schools-other-online-translators-with-clever-machine-learning/" target="_blank"><b>Read review by Techcrunch!</b></a></li>
                        <li>Currently DeepL Doc Translator provides limited number of free docs translations per day. You can purchase to <a href="https://www.deepl.com/pro?cta=homepage-free-trial#pricing" target="_blank">DeepL Pro</a> to increase this limit.</li>
                        </ol>
                        </div>
                        <div class="el-pluginby">
                            Plugin by<br/>
                            <a href="https://coolplugins.net" target="_blank"><img src="<?php echo ATLT_PRO_URL.'/assets/images/coolplugins-logo.png' ?>"/></a>
                        </div>
                    </div>
                </div>
    	    </div>
        </form>
    	    <?php
        }

        function inactivesettings_tab_content() {
            $api_key_one = get_option('LocoAutomaticTranslateAddonPro_Genimi_api_key', '');
            if (!empty($api_key_one)) {
                delete_option('LocoAutomaticTranslateAddonPro_Genimi_api_key');
                $api_key_one = '';
            }
            ?>
            <div class="el-license-container">
                <h3 class="el-license-title"><?php esc_html_e('Settings', 'Translate-Addon-Settings'); ?></h3>
                <div class="el-license-content">
                    <div class="el-license-form">
                        <h3 style="color: red;">Please add license key.</h3>
                        <form method="post" action="" class="Translate-Addon-Settings">
                            <div class="el-license-field">
                                <label for="api_key">Add Gemini API key</label>
                                <input disabled type="text" id="api_key" name="LocoAutomaticTranslateAddonPro_Genimi_api_key" value="<?php echo esc_attr($api_key_one); ?>" class="regular-text code" size="50" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" required="required">
                                <p><a class="el-license-GeminiAPIkeylink" target="_blank" href="https://locoaddon.com/docs/pro-plugin/how-to-use-gemini-ai-to-translate-plugins-or-themes/generate-gemini-api-key/">Click Here to See How to Generate Gemini API Key</a></p>
                            </div>
                            <div class="el-license-active-btn">
                                <input type="hidden" name="_wp_http_referer" value="<?php echo esc_url($_SERVER['REQUEST_URI']); ?>">
                                <p class="submit"><input disabled type="submit" name="submit" id="submit" class="button button-primary" value="Save"></p>
                            </div>
                        </form>
                    </div>
                    <div class="el-license-textbox">
                        <div class='el-license-geminiAPIkey'>
                            <h3>Rate Limits of Free Gemini API key</h3>
                            <ul>
                                <li><strong>15 RPM</strong> : This API Key allows a maximum of 15 requests per minute</li>
                                <li><strong>1 million TPM</strong> : With this API Key you can process up to 1 million tokens per minute</li>
                                <li><strong>1,500 RPD</strong> :  To ensure smooth performance, it allows up to 1,500 requests per day</li>
                            </ul>
                        </div>
                        <div class="el-pluginby">
                            Plugin by<br>
                            <a href="https://coolplugins.net" target="_blank"><img src="<?php echo ATLT_PRO_URL.'/assets/images/coolplugins-logo.png' ?>"></a>
                        </div>
                    </div>
                </div>
            </div>
            <?php
        }
    }

    new LocoAutomaticTranslateAddonPro();
}