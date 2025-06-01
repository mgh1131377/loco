<?php
/*
Plugin Name:Loco Automatic Translate Addon PRO
Description:(Premium) Loco Translate plugin addon to automatic translate plugins and themes translatable string with one click in any language (It supports Google, Yandex, DeepL, ChatGPT & GeminiAI).
Version:1.8
License:GPLv3
Text Domain:loco-translate-addon
Domain Path:languages
Author:Cool Plugins
Author URI:https://coolplugins.net/
 */
update_option("LocoAutomaticTranslateAddonPro_lic_Key", 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
update_option("LocoAutomaticTranslateAddonPro_lic_email",'mail@gmail.com');
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

define( 'ATLT_PRO_FILE', __FILE__ );
define( 'ATLT_PRO_URL', plugin_dir_url( ATLT_PRO_FILE ) );
define( 'ATLT_PRO_PATH', plugin_dir_path( ATLT_PRO_FILE ) );
define( 'ATLT_PRO_VERSION', '1.8' );

/**
 * @package Loco Automatic Translate Addon
 * @version 1.8
 */

if ( ! class_exists( 'LocoAutoTranslateAddonPro' ) ) {

	/** Singleton ************************************/
	final class LocoAutoTranslateAddonPro {


		/**
		 * The unique instance of the plugin.
		 *
		 * @var LocoAutoTranslateAddonPro
		 */
		private static $instance;

		/**
		 * Gets an instance of plugin.
		 */
		public static function get_instance() {
			if ( null === self::$instance ) {
				self::$instance = new self();

				// register all hooks
				self::$instance->register();

			}

			return self::$instance;
		}
		/**
		 * Constructor.
		 */
		public function __construct() {
			 // Setup your plugin object here
		}

		/**
		 * Registers our plugin with WordPress.
		 */
		public static function register() {
			 $thisPlugin = self::$instance;
			register_activation_hook( ATLT_PRO_FILE, array( $thisPlugin, 'atlt_activate' ) );
			register_deactivation_hook( ATLT_PRO_FILE, array( $thisPlugin, 'atlt_deactivate' ) );

			// run actions and filter only at admin end.
			if ( is_admin() ) {

				add_action( 'plugins_loaded', array( $thisPlugin, 'atlt_check_required_loco_plugin' ) );
				// add notice to use latest loco translate addon
				add_action( 'init', array( $thisPlugin, 'atlt_verify_loco_version' ) );
				add_action( 'init', array( $thisPlugin, 'onInit' ) );
				/*** Plugin Setting Page Link inside All Plugins List */
				add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( $thisPlugin, 'atlt_settings_page_link' ) );

				add_action( 'plugins_loaded', array( $thisPlugin, 'atlt_include_files' ) );
				add_action( 'admin_enqueue_scripts', array( $thisPlugin, 'atlt_enqueue_scripts' ) );

				/*since version 2.1 */
				add_filter( 'loco_api_providers', array( $thisPlugin, 'atlt_register_api' ), 10, 1 );
				add_action( 'loco_api_ajax', array( $thisPlugin, 'atlt_ajax_init' ), 0, 0 );
				add_action( 'wp_ajax_save_all_translations', array( $thisPlugin, 'save_translations_handler' ) );
				add_action( 'wp_ajax_atlt_cool_plugins_admin_notice', array( $thisPlugin, 'atlt_admin_notice_dismiss' ) );
				add_action('wp_ajax_my_ajax_handler', array($thisPlugin,'my_ajax_handler'));
				/*
				since version 2.0
				Yandex translate widget integration
				*/
				// add no translate attribute in html tag
				if ( isset( $_REQUEST['action'] ) && $_REQUEST['action'] == 'file-edit' ) {
					add_action( 'admin_footer', array( $thisPlugin, 'atlt_load_ytranslate_scripts' ), 100 );
					add_action( 'admin_footer', array( $thisPlugin, 'atlt_load_gtranslate_scripts' ), 100 );
					add_filter( 'admin_body_class', array( $thisPlugin, 'atlt_add_custom_class' ) );

				}
				add_action( 'init', array( $thisPlugin, 'atlt_set_gtranslate_cookie' ) );

			}

		}
		/*
		|----------------------------------------------------------------------
		| GeminiAI API calling
		|----------------------------------------------------------------------
		*/

		
		function my_ajax_handler() {

			if (!isset($_POST['source_data']) || !is_array($_POST['source_data'])) {
				wp_send_json_error('Invalid request.');
				return;
			}
		
			$data = $_POST['source_data']['source'];
			$locale = $_POST['source_data']['locale']['label'];
		
			$config = array(
				'sourceLang' => 'English',
				'targetLang' => $locale
			);
			$chunk = array_values($data);
		
			$apiKey = get_option('LocoAutomaticTranslateAddonPro_Genimi_api_key');
		
			function makeApiCall($chunk, $config, $apiKey) {
				$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' . $apiKey;
		
				$headers = [
					'Content-Type' => 'application/json'
				];
		
				$payload = array(
					'contents' => array(
						array(
							'parts' => array(
								array(
									'text' => sprintf(
										'Instruction 1: [%%s, %%d, %%S, %%D, %%s, %%S, %%d, %%D, %%س] These placeholders are special and should not be translated. Instruction 2: Avoid repeating translations and skip any strings if necessary. If a string is skipped, maintain its original key. Instruction 3: Return the translation in the format of a JSON array with "source" and "target" keys. "Source" should contain the original strings from the given JSON array, while "target" should include their translations. Instruction 4: Use "\\" to escape special characters like \" and " to ensure valid JSON format. Instruction 5: Translate the provided JSON array into %s language, regardless of whether the values are the same and Ensure the JSON is well-formed and complete. Please ensure that the output follows the format: {"key(numeric value)":{"source": "(original strings from the JSON)", "target": "(translations of the strings in %s language)}}" Strings are :- %s',
										$config['targetLang'],
										$config['targetLang'],
										json_encode($chunk)
									)
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
					return false;
				} else {
					error_log('API response: ' . wp_remote_retrieve_body($response));
					return $response;
				}
			}
		
			$response_data = makeApiCall($chunk, $config, $apiKey);
			$response_body = wp_remote_retrieve_body($response_data);
			$data = json_decode($response_body, true);

			if (is_wp_error($response_data) || empty($data)) {
				wp_send_json_error('Request failed or no data received');
			} elseif (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
				// Navigate through the decoded array to extract the text
				$text = $data['candidates'][0]['content']['parts'][0]['text'];
				$cleanText = preg_replace('/(^```json\n|```$)/', '', $text);
				
				wp_send_json_success(json_decode($cleanText));
			} else {
				wp_send_json_error($data['error']['code']);
			}
		}

		
		
		public function atlt_admin_notice_dismiss() {
			$id       = isset( $_REQUEST['id'] ) ? sanitize_text_field( $_REQUEST['id'] ) : '';
			$wp_nonce = $id . '_notice_nonce';
			if ( ! check_ajax_referer( $wp_nonce, '_nonce', false ) ) {
				die('nonce verification failed!');
			} else {
				$us = update_option($id.'_remove_notice','yes');
				die('Admin message removed!');
			}
		}
		public function onInit() {
			if ( in_array(
				'automatic-translator-addon-for-loco-translate/automatic-translator-addon-for-loco-translate.php',
				apply_filters( 'active_plugins', get_option( 'active_plugins' ) )
			) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
				deactivate_plugins( 'automatic-translator-addon-for-loco-translate/automatic-translator-addon-for-loco-translate.php' );
				return;
			}

			if ( isset( $_REQUEST['action'] ) && $_REQUEST['action'] == 'file-edit' ) {
				// add notice if license key is missing
				$key = trim( ProHelpers::getLicenseKey() );
				if ( ProHelpers::validKey( $key ) == false ) {
					add_action( 'admin_notices', array( self::$instance, 'atlt_add_license_notice' ) );
				}
			}

		}
		/*
		|----------------------------------------------------------------------
		| Register API Manager inside Loco Translate Plugin
		|----------------------------------------------------------------------
		*/
		function atlt_register_api( array $apis ) {
			$apis[] = array(
				'id'   => 'loco_auto',
				'key'  => '122343',
				'url'  => 'https://locoaddon.com/',
				'name' => 'Automatic Translate Addon',
			);
			return $apis;
		}
		/*
		|----------------------------------------------------------------------
		| Auto Translate Request handler
		|----------------------------------------------------------------------
		*/
		function atlt_ajax_init() {
			add_filter( 'loco_api_translate_loco_auto', array( self::$instance, 'loco_auto_translator_process_batch' ), 0, 3 );
		}

		/**
		 * Hook fired as a filter for the "loco_auto" translation API.
		 *
		 * @param array       $sources Input strings.
		 * @param Loco_Locale $Locale  Target locale for translations.
		 * @param array       $config  Our own API configuration.
		 *
		 * @return array Output strings.
		 */
		function loco_auto_translator_process_batch( array $sources, Loco_Locale $Locale, array $config ) {
			$targets = array();

			// Extract domain from the referrer URL
			$url_data   = $this->parse_query( $_SERVER['HTTP_REFERER'] );
			$domain     = isset( $url_data['domain'] ) && ! empty( $url_data['domain'] ) ? $url_data['domain'] : 'temp';
			$lang       = $Locale->lang;
			$region     = $Locale->region;
			$project_id = $domain . '-' . $lang . '-' . $region;

			// Combine transient parts if available
			$allString = array();
			for ( $i = 0; $i <= 4; $i++ ) {
				$transient_part = get_transient( $project_id . '-part-' . $i );

				if ( ! empty( $transient_part ) ) {
					$allString = array_merge( $allString, $transient_part );
				}
			}
			if ( ! empty( $allString ) ) {
				foreach ( $sources as $i => $source ) {
					// Find the index of the source string in the cached strings
					$index = array_search( $source, array_column( $allString, 'source' ) );

					if ( is_numeric( $index ) && isset( $allString[ $index ]['target'] ) ) {
						$targets[ $i ] = $allString[ $index ]['target'];
					} else {
						$targets[ $i ] = '';
					}
				}
				return $targets;
			} else {
				throw new Loco_error_Exception( 'Please translate strings using the Auto Translate addon button first.' );
			}

		}

		/**
		 * Parse the query string from the URL.
		 *
		 * @param string $var URL to parse.
		 *
		 * @return array Parsed query parameters.
		 */
		function parse_query( $var ) {
			$var = parse_url( $var, PHP_URL_QUERY );
			$var = html_entity_decode( $var );
			$var = explode( '&', $var );
			$arr = array();

			foreach ( $var as $val ) {
				$x            = explode( '=', $val );
				$arr[ $x[0] ] = $x[1];
			}

			unset( $val, $x, $var );
			return $arr;
		}

		/*
		|----------------------------------------------------------------------
		| Save string translation inside cache for later use
		|----------------------------------------------------------------------
		*/
		 // save translations inside transient cache for later use
		function save_translations_handler() {

			check_ajax_referer( 'loco-addon-nonces', 'wpnonce' );

			if ( isset( $_POST['data'] ) && ! empty( $_POST['data'] ) && isset( $_POST['part'] ) ) {

				$allStrings = json_decode( stripslashes( $_POST['data'] ), true );
				if ( empty( $allStrings ) ) {
					echo json_encode(
						array(
							'success' => false,
							'error'   => 'No data found in the request. Unable to save translations.',
						)
					);
					wp_die();
				}

				// Determine the project ID based on the loop value
				$projectId = $_POST['project-id'] . $_POST['part'];
				// Save the strings in transient with appropriate part value
				$rs = set_transient( $projectId, $allStrings, 5 * MINUTE_IN_SECONDS );
				echo json_encode(
					array(
						'success'  => true,
						'message'  => 'Translations successfully stored in the cache.',
						'response' => $rs == true ? 'saved' : 'cache already exists',
					)
				);

			} else {
				// Security check failed or missing parameters
				echo json_encode( array( 'error' => 'Invalid request. Missing required parameters.' ) );
			}
			wp_die();
		}


		/*
		|----------------------------------------------------------------------
		| Yandex Translate Widget Integartions
		| add no translate attribute in html tag
		|----------------------------------------------------------------------
		*/
		function atlt_load_ytranslate_scripts() {
			if ( isset( $_REQUEST['action'] ) && $_REQUEST['action'] == 'file-edit' ) {
				echo "<script>document.getElementsByTagName('html')[0].setAttribute('translate', 'no');</script>";
			}
		}
		 // add no translate class in admin body to disable whole page translation
		function atlt_add_custom_class( $classes ) {
			return "$classes notranslate";
		}

		/*
		|----------------------------------------------------------------------
		| Google Translate Widget integrations
		| load Google Translate widget scripts
		|----------------------------------------------------------------------
		*/
		function atlt_load_gtranslate_scripts() {

			echo "<script>
           function gTranslateWidget() {
               var locale=locoConf.conf.locale;
               var defaultcode = locale.lang?locale.lang:null;
               switch(defaultcode){
                   case 'bel':
                   defaultlang='be';
                   break;
                   case 'he':
                       defaultlang='iw';
                       break;
                   case'snd':
                       defaultlang='sd';
                   break;
                   case 'jv':
                       defaultlang='jw';
                       break;
                       case 'nb':
                           defaultlang='no';
                           break;
             
                           case 'nn':
                             defaultlang='no';
                             break;
                   default:
                   defaultlang=defaultcode;
               break;
               return defaultlang;
               }
              if(defaultlang=='zh'){
              new google.translate.TranslateElement(
                   {
                   pageLanguage: 'en',
                   includedLanguages: 'zh-CN,zh-TW',
                   defaultLanguage: 'zh-CN,zh-TW',
                   multilanguagePage: true
                   },
                   'google_translate_element'
               );
           }
           else{
               new google.translate.TranslateElement(
                   {
                   pageLanguage: 'en',
                   includedLanguages: defaultlang,
                   defaultLanguage: defaultlang,
                   multilanguagePage: true
                   },
                   'google_translate_element'
               );
           }
           }
           </script>
           <script src='https://translate.google.com/translate_a/element.js'></script>
           ";
		}

		// set default option in google translate widget using cookie
		function atlt_set_gtranslate_cookie() {
			// setting your cookies there
			if ( ! isset( $_COOKIE['googtrans'] ) ) {
				setcookie( 'googtrans', '/en/Select Language', 2147483647 );
			}
		}
		/*
		|----------------------------------------------------------------------
		| check if required "Loco Translate" plugin is active
		| also register the plugin text domain
		|----------------------------------------------------------------------
		*/
		public function atlt_check_required_loco_plugin() {
			if ( ! function_exists( 'loco_plugin_self' ) ) {
				add_action( 'admin_notices', array( self::$instance, 'atlt_plugin_required_admin_notice' ) );
			}
			// load language files
			load_plugin_textdomain( 'loco-auto-translate', false, basename( dirname( __FILE__ ) ) . '/languages/' );
		}
		/*
		|----------------------------------------------------------------------
		| Notice to 'Admin' if "Loco Translate" is not active
		|----------------------------------------------------------------------
		*/
		public function atlt_plugin_required_admin_notice() {
			if ( current_user_can( 'activate_plugins' ) ) {
				$url         = 'plugin-install.php?tab=plugin-information&plugin=loco-translate&TB_iframe=true';
				$title       = 'Loco Translate';
				$plugin_info = get_plugin_data( __FILE__, true, true );
				echo '<div class="error"><p>' .
				sprintf(
					__(
						'In order to use <strong>%1$s</strong> plugin, please install and activate the latest version  of <a href="%2$s" class="thickbox" title="%3$s">%4$s</a>',
						'automatic-translator-addon-for-loco-translate'
					),
					$plugin_info['Name'],
					esc_url( $url ),
					esc_attr( $title ),
					esc_attr( $title )
				) . '.</p></div>';

				deactivate_plugins( __FILE__ );
			}
		}
		/*
		|----------------------------------------------------------------------
		| create 'settings' link in plugins page
		|----------------------------------------------------------------------
		*/
		public function atlt_settings_page_link( $links ) {
			$links[] = '<a style="font-weight:bold" href="' . esc_url( get_admin_url( null, 'admin.php?page=loco-atlt-register' ) ) . '">License</a>';
			return $links;
		}


		/*
		|----------------------------------------------------------------------
		| check User Status
		|----------------------------------------------------------------------
		*/
		public function atlt_verify_loco_version() {
			if ( function_exists( 'loco_plugin_version' ) ) {
				 $locoV = loco_plugin_version();
				if ( version_compare( $locoV, '2.4.0', '<' ) ) {
					add_action( 'admin_notices', array( self::$instance, 'use_loco_latest_version_notice' ) );
				}
			}
		}
		/*
		|----------------------------------------------------------------------
		| Notice to use latest version of Loco Translate plugin
		|----------------------------------------------------------------------
		*/
		public function use_loco_latest_version_notice() {
			if ( current_user_can( 'activate_plugins' ) ) {
				$url         = 'plugin-install.php?tab=plugin-information&plugin=loco-translate&TB_iframe=true';
				$title       = 'Loco Translate';
				$plugin_info = get_plugin_data( __FILE__, true, true );
				echo '<div class="error"><p>' .
				sprintf(
					__(
						'In order to use <strong>%1$s</strong> (version <strong>%2$s</strong>), Please update <a href="%3$s" class="thickbox" title="%4$s">%5$s</a> official plugin to a latest version (2.4.0 or upper)',
						'automatic-translator-addon-for-loco-translate'
					),
					$plugin_info['Name'],
					$plugin_info['Version'],
					esc_url( $url ),
					esc_attr( $title ),
					esc_attr( $title )
				) . '.</p></div>';

			}
		}

		/*
		|----------------------------------------------------------------------
		| required php files
		|----------------------------------------------------------------------
		*/
		public function atlt_include_files() {

			require_once ATLT_PRO_PATH . '/includes/Register/LocoAutomaticTranslateAddonProBase.php';
			new LocoAutomaticTranslateAddonProBase( ATLT_PRO_FILE );
			require_once ATLT_PRO_PATH . 'includes/Helpers/ProHelpers.php';
			require_once ATLT_PRO_PATH . 'includes/Register/LocoAutomaticTranslateAddonPro.php';
			require_once ATLT_PRO_PATH . 'includes/ReviewNotice/atlt-feedback-notice.php';
			
		}

		/*
		|------------------------------------------------------------------------
		|  Enqueue required JS file
		|------------------------------------------------------------------------
		*/
		function atlt_enqueue_scripts( $hook ) {
			// load assets only on editor page
			if ( $hook == 'loco-translate_page_loco-atlt-register' ) {
				return;
			}
			if (
			( isset( $_REQUEST['action'] ) && $_REQUEST['action'] == 'file-edit' ) ) {
				$key = trim( ProHelpers::getLicenseKey() );
				if ( ProHelpers::validKey( $key ) ) {
					wp_register_script( 'loco-addon-custom', ATLT_PRO_URL . 'assets/js/pro-custom.min.js', array( 'loco-translate-admin' ), ATLT_PRO_VERSION, true );
				} else {
					wp_register_script( 'loco-addon-custom', ATLT_PRO_URL . 'assets/js/custom.min.js', array( 'loco-translate-admin' ), ATLT_PRO_VERSION, true );
				}

					wp_register_style(
						'loco-addon-custom-css',
						ATLT_PRO_URL . 'assets/css/custom.min.css',
						null,
						ATLT_PRO_VERSION,
						'all'
					);
					// load yandex widget
					wp_register_script( 'atlt-yandex-widget', ATLT_PRO_URL . 'assets/js/widget.js?widgetId=ytWidget&pageLang=en&widgetTheme=light&autoMode=false', array( 'loco-translate-admin' ), ATLT_PRO_VERSION, true );

						wp_enqueue_script( 'loco-addon-custom' );
						wp_enqueue_script( 'atlt-yandex-widget' );
						wp_enqueue_style( 'loco-addon-custom-css' );

						$key = trim( ProHelpers::getLicenseKey() );
				if ( ProHelpers::validKey( $key ) ) {
					// Enqueue Deepl JS file
					wp_enqueue_script( 'doc_index', 'https://unpkg.com/docx@5.0.2/build/index.js', array( 'jquery' ), ATLT_PRO_VERSION, true );
					wp_enqueue_script( 'filesaver', 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.8/FileSaver.js', array( 'jquery' ), ATLT_PRO_VERSION, true );
					wp_enqueue_script( 'docxtemplater', 'https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.1.9/docxtemplater.js', array( 'jquery' ), ATLT_PRO_VERSION, true );
					wp_enqueue_script( 'jszip', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/2.6.1/jszip.js', array( 'jquery' ), ATLT_PRO_VERSION, true );
				}

				$api_key = get_option('LocoAutomaticTranslateAddonPro_Genimi_api_key', '');

				$extraData['ajax_url']        = admin_url( 'admin-ajax.php' );
				$extraData['nonce']           = wp_create_nonce( 'loco-addon-nonces' );
				$extraData['ATLT_URL']        = ATLT_PRO_URL;
				$extraData['preloader_path']  = 'preloader.gif';
				$extraData['gt_preview']      = 'powered-by-google.png';
				$extraData['dpl_preview']     = 'powered-by-deepl.png';
				$extraData['yt_preview']      = 'powered-by-yandex.png';
				$extraData['chatGPT_preview'] = 'powered-by-chatGPT.png';
				$extraData['geminiAI_preview'] = 'powered-by-geminiAI.png';
				$extraData['extra_class']= is_rtl() ? 'atlt-rtl' : '';
				$extraData['api_key']         = $api_key ? true : false;
				$extraData['api_key_url'] = admin_url('admin.php?page=loco-atlt-register&tab=API-key');
				    $extraData['loco_settings_url'] = admin_url( 'admin.php?page=loco-config&action=apis' );

					wp_localize_script( 'loco-addon-custom', 'extradata', $extraData );
					// copy object
					wp_add_inline_script(
						'loco-translate-admin',
						'
            var returnedTarget = JSON.parse(JSON.stringify(window.loco));
            window.locoConf=returnedTarget;'
					);	
			}
		}

		/*
		|------------------------------------------------------
		|    Plugin activation
		|------------------------------------------------------
		*/
		public function atlt_add_license_notice() {
			$settings_page_link = esc_url( get_admin_url( null, 'admin.php?page=loco-atlt-register' ) );
			$notice             = __( '<strong>Loco Automatic Translate Addon Pro</strong> - License key is missing! Please add your License key in the settings panel to activate all premium features.', 'loco-translate-addon' );
			echo '<div class="error loco-pro-missing" style="border:2px solid;border-color:#dc3232;"><p>' . $notice . '</p>
          <p><a class="button button-primary" href="' . esc_url( $settings_page_link ) . '">' . __( 'Add License Key' ) . '</a> (You can find license key inside order purchase email or visit <a href="https://locoaddon.com/my-account/orders/?utm_source=atlt_plugin&utm_medium=inside&utm_campaign=get_pro&utm_content=get_geminiAPIKey" target="_blank">https://locoaddon.com/my-account/orders/</a>)</p></div>';

		}
		/*
		|------------------------------------------------------
		|    Plugin activation
		|------------------------------------------------------
		*/
		public function atlt_activate() {
			update_option( 'atlt-pro-version', ATLT_PRO_VERSION );
			update_option( 'atlt-pro-installDate', gmdate( 'Y-m-d h:i:s' ) );
			update_option( 'atlt-type', 'PRO' );
		}
		/*
		|-------------------------------------------------------
		|    Plugin deactivation
		|-------------------------------------------------------
		*/
		public function atlt_deactivate() {

		}

		/**
		 * Throw error on object clone.
		 *
		 * The whole idea of the singleton design pattern is that there is a single
		 * object therefore, we don't want the object to be cloned.
		 */
		public function __clone() {
			// Cloning instances of the class is forbidden.
			_doing_it_wrong( __FUNCTION__, __( 'Cheatin&#8217; huh?', 'loco-auto-translate' ), '2.3' );
		}

		/**
		 * Disable unserializing of the class.
		 */
		public function __wakeup() {
			// Unserializing instances of the class is forbidden.
			_doing_it_wrong( __FUNCTION__, __( 'Cheatin&#8217; huh?', 'loco-auto-translate' ), '2.3' );
		}

	}

	function ATLT_PRO() {
		return LocoAutoTranslateAddonPro::get_instance();
	}
	ATLT_PRO();

}

