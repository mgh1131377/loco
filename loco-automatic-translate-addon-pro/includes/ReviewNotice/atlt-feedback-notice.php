<?php
namespace AtltFeedbackNotice;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}
if ( ! class_exists( 'AtltFeedbackNotice' ) ) :
	final class AtltFeedbackNotice {

		private static $instance = null;
		private $messages        = array();
		private $version         = '1.0.0';
		/**
		 * initialize the class with single instance
		 */
		public static function atlt_create_notice() {
			if ( ! empty( self::$instance ) ) {
				return self::$instance;
			}
			return self::$instance = new self();
		}
		/**
		 * add messages for admin notice
		 *
		 * @param array $notice this array contains $id,$message,$type,$class,$id
		 */
		public function atlt_add_message( $notice ) {
			if ( ! isset( $notice['id'] ) || empty( $notice['id'] ) ) {
				$this->atlt_show_error( 'id is required for integrating admin notice.' );
				return;
			}
			if ( array_key_exists( $notice['id'], $this->messages ) ) {
			}

			if ( isset( $notice['review'] ) && true != (bool) $notice['review'] && ( ! isset( $notice['message'] ) || empty( $notice['message'] ) ) ) {
				$this->atlt_show_error( 'message can not be null. You must provide some text for message field' );
				return;
			}
			$message         = ( isset( $notice['message'] ) && ! empty( $notice['message'] ) ) ? wp_kses( $notice['message'], 'post' ) : null;
			$type            = ( isset( $notice['type'] ) && ! empty( $notice['type'] ) ) ? 'notice-' . sanitize_text_field( $notice['type'] ) : 'notice-success';
			$class           = ( isset( $notice['class'] ) && ! empty( $notice['class'] ) ) ? sanitize_text_field( $notice['class'] ) : '';
			$review          = (bool) ( isset( $notice['review'] ) && ! empty( $notice['review'] ) ) ? sanitize_text_field( $notice['review'] ) : false;
			$slug            = ( isset( $notice['slug'] ) && ! empty( $notice['slug'] ) ) ? sanitize_text_field( $notice['slug'] ) : '';
			$plugin_name     = ( isset( $notice['plugin_name'] ) && ! empty( $notice['plugin_name'] ) ) ? sanitize_text_field( $notice['plugin_name'] ) : '';
			$logo            = ( isset( $notice['logo'] ) && ! empty( $notice['logo'] ) ) ? esc_url( $notice['logo'] ) : null;
			$review_url      = ( isset( $notice['review_url'] ) && ! empty( $notice['review_url'] ) ) ? esc_url( $notice['review_url'] ) : '';
			$review_interval = ( isset( $notice['review_interval'] ) && ! empty( $notice['review_interval'] ) ) ? sanitize_text_field( $notice['review_interval'] ) : '3';
			if ( $review == true && ( empty( $slug ) || empty( $plugin_name ) || empty( $review_url ) ) ) {
				$this->atlt_show_error( 'slug / plugin_name / review_url can not be empty if admin notice is set to review' );
				return;
			}
			$this->messages[ $notice['id'] ] = array(
				'message'         => $message,
				'type'            => $type,
				'class'           => $class,
				'review'          => $review,
				'logo'            => $logo,
				'slug'            => $slug,
				'plugin_name'     => $plugin_name,
				'review_url'      => $review_url,
				'review_interval' => $review_interval,
			);

			add_action( 'admin_notices', array( $this, 'atlt_show_notice' ) );
			add_action( 'admin_print_scripts', array( $this, 'atlt_load_script' ) );
			add_action( 'wp_ajax_atlt_cool_plugins_admin_notice', array( $this, 'atlt_admin_notice_dismiss' ) );
			add_action( 'wp_ajax_atlt_cool_plugins_admin_review_notice_dismiss', array( $this, 'atlt_admin_review_notice_dismiss' ) );
		}
		/**
		 * Load script to dismiss notices.
		 *
		 * @return void
		 */
		public function atlt_load_script() {
			wp_register_style( 'atlt-review-css', ATLT_PRO_URL . 'assets/css/atlt-admin-notice.css', null, null, 'all' );
			wp_enqueue_style( 'atlt-review-css' );
		}
		/**
		 * Create simple admin notice
		 */
		public function atlt_show_notice() {
			if ( count( $this->messages ) > 0 ) {
				foreach ( $this->messages as $id => $message ) {
					if ( true == (bool) $message['review'] ) {
						$this->atlt_admin_notice_for_review( $id, $message );
					} else {
						$this->atlt_simple_notice( $id, $message );
					}
				}
			}
		}
		/**
		 * Due to the nature of private function. This must not be called directly
		 * Create simple text/html admin notice and initialize required JS
		 *
		 * @param array $message This is an array of message object
		 */
		private function atlt_simple_notice( $id, $message ) {
			if ( get_option( $id . '_remove_notice' ) ) {
				return;
			}
			$classes  = 'notice ' . trim( $message['type'] ) . ' is-dismissible ' . trim( $message['class'] );
			$script   = '<script>
            jQuery(document).ready(function ($) {
                $(".' . $id . '_admin_notice .notice-dismiss").css("border","2px solid red");
                $(document).on("click",".' . $id . '_admin_notice button.notice-dismiss", function (event) {
                    var $this = $(this);
                    var wrapper=$this.parents(".' . $id . '_admin_notice");
                    var ajaxURL=wrapper.data("ajax-url");
                    var id = wrapper.data("plugin-slug");
                    var wp_nonce = wrapper.data("wp-nonce");
                    $.post(ajaxURL, { "action":"atlt_cool_plugins_admin_notice","id":id,"_nonce":wp_nonce }, function( data ) {
                        wrapper.slideUp("fast");
                      }, "json");
                });
            });
            </script>';
			$nonce    = wp_create_nonce( $id . '_notice_nonce' );
			$img_path = ( isset( $message['logo'] ) && ! empty( $message['logo'] ) ) ? esc_url( $message['logo'] ) : null;
			if ( $img_path != null ) {
				$image_html = '<div class="logo_container"><a href="' . esc_url( $url ) . '"><img src="' . esc_url( $img_path ) . '" style="max-width:70px;"></a></div>';
			} else {
				$image_html = '';
			}
			echo "<div class='" . $id . "_admin_notice $classes atlt-simple-notice' data-ajax-url='" . admin_url( 'admin-ajax.php' ) . "' data-wp-nonce='" . $nonce . "' data-plugin-slug='$id'>$image_html<div class='message_container'><p>" . $message['message'] . '</p></div></div>' . $script;
		}
		/**
		 * This function decides if its good to show the review notice or not
		 * Review notice will only be displayed if $slug_activation_time is greater or equals to the 3 days
		 */
		private function atlt_admin_notice_for_review( $id, $messageObj ) {
			// Everyone should not be able see the review message
			if ( ! current_user_can( 'update_plugins' ) ) {
				return;
			}
			$slug = $messageObj['slug'];
			$days = $messageObj['review_interval'];
			if ( get_option( 'atlt-installDate' ) ) {
				$installation_date = date( 'Y-m-d h:i:s', strtotime( get_option( 'atlt-installDate' ) ) );
			} else {
				$this->atlt_show_error( 'Review notice can not be integrated. atlt-installDate option is not set for the plugin' );
				return;
			}
			$alreadyRated = get_option( 'atlt-pro-ratingDiv' ) != false ? get_option( 'atlt-pro-ratingDiv' ) : 'no';
			// check user already rated
			if ( $alreadyRated == 'yes' ) {
				return;
			}
			// grab plugin installation date and compare it with current date
			$display_date = date( 'Y-m-d h:i:s' );
			$install_date = new \DateTime( $installation_date );
			$current_date = new \DateTime( $display_date );
			$difference   = $install_date->diff( $current_date );
			$diff_days    = $difference->days;
			// check if installation days is greator then week
			if ( isset( $diff_days ) && $diff_days >= $days ) {
				echo $this->atlt_create_notice_content( $id, $messageObj );
			}
		}
		/**
		 * Generate review notice HTMl with all required css & js
		 *
		 * @param array $messageObj array of a message object
		 **/
		function atlt_create_notice_content( $id, $messageObj ) {
			$ajax_url           = admin_url( 'admin-ajax.php' );
			$ajax_callback      = 'atlt_cool_plugins_admin_review_notice_dismiss';
			$wrap_cls           = 'notice notice-info is-dismissible';
			$img_path           = ( isset( $messageObj['logo'] ) && ! empty( $messageObj['logo'] ) ) ? esc_url( $messageObj['logo'] ) : null;
			$slug               = $messageObj['slug'];
			$plugin_name        = $messageObj['plugin_name'];
			$like_it_text       = 'Rate Now! ★★★★★';
			$already_rated_text = esc_html__( 'I already rated it', 'atlt2' );
			$not_like_it_text   = esc_html__( 'Not Interested', 'atlt2' );
			$plugin_link        = $messageObj['review_url'];
			$pro_url            = esc_url( 'https://1.envato.market/calendar' );
			$review_nonce       = wp_create_nonce( $id . '_review_nonce' );
			$message            = "Thanks for using <b>$plugin_name</b> - WordPress plugin.
        We hope you liked it ! <br/>Please give us a quick rating, it works as a boost for us to keep working on more <a href='https://coolplugins.net' target='_blank'><strong>Cool Plugins</strong></a>!<br/>";
			$html               = '<div data-ajax-url="%8$s" data-plugin-slug="%11$s" data-wp-nonce="%12$s" id="%13$s" data-ajax-callback="%9$s" class="%11$s-feedback-notice-wrapper %1$s">';
			if ( $img_path != null ) {
				$html .= '<div class="logo_container"><a href="%5$s"><img src="%2$s" alt="%3$s" style="max-width:80px;"></a></div>';
			}
			$html  .= '<div class="message_container">%4$s
        <div class="callto_action">
        <ul>
            <li class="love_it"><a href="%5$s" class="like_it_btn button button-primary" target="_new" title="%6$s">%6$s</a></li>
            <li class="already_rated"><a href="javascript:void(0);" class="already_rated_btn button %11$s_dismiss_notice" title="%7$s">%7$s</a></li>  
            <li class="already_rated"><a href="javascript:void(0);" class="already_rated_btn button %11$s_dismiss_notice" title="%10$s">%10$s</a></li>    
        </ul>
        <div class="clrfix"></div>
        </div>
        </div>
        </div>';
			$script = '<script>
        jQuery(document).ready(function ($) {
            $(document).on("click", "#' . $id . ' .' . $slug . '_dismiss_notice", function (event) {
                var $this = $(this);
                var wrapper=$this.parents(".' . $slug . '-feedback-notice-wrapper");
                var ajaxURL=wrapper.data("ajax-url");
                var ajaxCallback=wrapper.data("ajax-callback");
                var slug = wrapper.data("plugin-slug");
                var id = wrapper.attr("id");
                var wp_nonce = wrapper.data("wp-nonce");
                $.post(ajaxURL, { "action":ajaxCallback,"slug":slug,"id":id,"_nonce":wp_nonce }, function( data ) {
                    wrapper.slideUp("fast");
                  })
            });
        });
        </script>';
			$html  .= $script;
			return sprintf(
				$html,
				$wrap_cls,
				$img_path,
				$plugin_name,
				$message,
				$plugin_link,
				$like_it_text,
				$already_rated_text,
				$ajax_url, // 8
				$ajax_callback, // 9
				$not_like_it_text, // 10
				$slug, // 11
				$review_nonce, // 12
				$id, // 13
				$pro_url
			);
		}
		/**
		 * This function will dismiss the review notice.
		 * This is called by a WordPress ajax hook
		 */
		public function atlt_admin_review_notice_dismiss() {
			$id        = isset( $_REQUEST['id'] ) ? sanitize_text_field( $_REQUEST['id'] ) : '';
			$nonce_key = $id . '_review_nonce';
			if ( ! check_ajax_referer( $nonce_key, '_nonce', false ) ) {
				echo wp_json_encode( array( 'error' => 'nonce verification failed!' ) );
				die();
			} else {
				update_option( 'atlt-pro-ratingDiv', 'yes' );
				echo wp_json_encode( array( 'success' => 'true' ) );
				die();
			}
		}
		/************************************************************
		 * This function will dismiss the text/html admin notice    *
		 * This is called by a WordPress ajax hook                  *
		 ************************************************************/
		public function atlt_admin_notice_dismiss() {
			$id       = isset( $_REQUEST['id'] ) ? sanitize_text_field( $_REQUEST['id'] ) : '';
			$wp_nonce = $id . '_notice_nonce';
			if ( ! check_ajax_referer( $wp_nonce, '_nonce', false ) ) {
				die( 'nonce verification failed!' );
			} else {
				$us = update_option( $id . '_remove_notice', 'yes' );
				die( 'Admin message removed!' );
			}
		}
		/**************************************************************
		 * This function is used by the class for displaying error    *
		 *  in case of wrong implementation of the class.             *
		 **************************************************************/
		private function atlt_show_error( $error_text ) {
			$er  = "<div style='text-align:center;margin-left:20px;padding:10px;background-color: #cc0000; color: #fce94f; font-size: x-large;'>";
			$er .= 'Error: ' . $error_text;
			$er .= '</div>';
			echo wp_kses_post( $er );
		}
	}   // end of main class atlt_admin_notices;
endif;
	/********************************************************************************
	 * A global function to create admin notice/review box using the above class.   *
	 * This function makes it easy to use above class                               *
	 ********************************************************************************/
function atlt_pro_create_admin_notice( $notice ) {
	// Do not initialize anything if it's not WordPress admin dashboard
	if ( ! is_admin() ) {
		return;
	}
	$main_class = AtltFeedbackNotice::atlt_create_notice();
	$main_class->atlt_add_message( $notice );
	return $main_class;
}
